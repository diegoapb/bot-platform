import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  channelLinks,
  contactFacts,
  contactMemories,
  tenants,
  type ContactFactRow,
  type ConversationRow,
} from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { generate, textOf } from "../integrations/llm.js";
import { MEMORY_SUMMARY_MAX_CHARS } from "@bot/shared";
import { conversations } from "../db/schema.js";

/**
 * Memoria por cliente (US-013): hechos clave-valor + resumen acumulado,
 * anclados al channel_link (aislamiento por tenant/bot, P1). La consolidación
 * la dispara el job al detectar conversaciones inactivas >6h.
 */

export type Memory = {
  facts: Array<Pick<ContactFactRow, "key" | "value" | "origin" | "updatedAt">>;
  summary: string | null;
  updatedAt: Date | null;
};

export async function getMemory(channelLinkId: string): Promise<Memory> {
  const [facts, [mem]] = await Promise.all([
    db
      .select({
        key: contactFacts.key,
        value: contactFacts.value,
        origin: contactFacts.origin,
        updatedAt: contactFacts.updatedAt,
      })
      .from(contactFacts)
      .where(eq(contactFacts.channelLinkId, channelLinkId)),
    db.select().from(contactMemories).where(eq(contactMemories.channelLinkId, channelLinkId)),
  ]);
  return {
    facts,
    summary: mem?.summary ?? null,
    updatedAt: mem?.updatedAt ?? null,
  };
}

/** Upsert idempotente por (contacto, clave) — P3. */
export async function upsertFact(
  channelLinkId: string,
  key: string,
  value: string,
  origin: "bot" | "human",
  actorId?: string,
): Promise<void> {
  const [link] = await db
    .select()
    .from(channelLinks)
    .where(eq(channelLinks.id, channelLinkId));
  if (!link) throw new Error(`channel_link ${channelLinkId} no existe`);

  await db
    .insert(contactFacts)
    .values({
      tenantId: link.tenantId,
      botId: link.botId,
      channelLinkId,
      key,
      value,
      origin,
      updatedBy: actorId ?? null,
    })
    .onConflictDoUpdate({
      target: [contactFacts.channelLinkId, contactFacts.key],
      set: { value, origin, updatedBy: actorId ?? null, updatedAt: new Date() },
    });
}

export async function deleteFact(channelLinkId: string, key: string): Promise<boolean> {
  const rows = await db
    .delete(contactFacts)
    .where(and(eq(contactFacts.channelLinkId, channelLinkId), eq(contactFacts.key, key)))
    .returning({ id: contactFacts.id });
  return rows.length > 0;
}

/** Borrado completo e irreversible de la memoria del contacto (3.3). */
export async function wipe(channelLinkId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(contactFacts).where(eq(contactFacts.channelLinkId, channelLinkId));
    await tx.delete(contactMemories).where(eq(contactMemories.channelLinkId, channelLinkId));
  });
}

const extractionSchema = z.object({
  facts: z
    .array(z.object({ key: z.string().min(1).max(100), value: z.string().min(1).max(500) }))
    .default([]),
  summary: z.string().default(""),
});

/**
 * Consolidación (2.1–2.4): el LLM extrae hechos nuevos y reescribe el resumen
 * a partir del transcript + memoria previa. Ante cualquier fallo, la memoria
 * previa queda intacta (P2) y la conversación se marca consolidada igualmente
 * para no reintentar en loop.
 */
export async function consolidate(convo: ConversationRow): Promise<void> {
  const markConsolidated = () =>
    db
      .update(conversations)
      .set({ consolidatedAt: new Date() })
      .where(eq(conversations.id, convo.id));

  try {
    const [link] = await db
      .select()
      .from(channelLinks)
      .where(eq(channelLinks.id, convo.channelLinkId));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, convo.tenantId));
    if (!link || !tenant?.chatwootAccountId) {
      await markConsolidated();
      return;
    }

    const raw = await chatwoot.listMessages(tenant.chatwootAccountId, link.cwConversationId);
    const transcript = raw
      .filter((m) => !m.private && m.content)
      .slice(-50)
      .map((m) => `${m.message_type === 0 ? "Cliente" : "Equipo"}: ${m.content}`)
      .join("\n");
    if (!transcript) {
      await markConsolidated();
      return;
    }

    const prev = await getMemory(link.id);
    const result = await generate({
      system: [
        "Eres un extractor de memoria para un agente de atención al cliente.",
        "A partir del transcript y la memoria previa, devuelve SOLO un JSON válido con esta forma:",
        '{"facts": [{"key": "...", "value": "..."}], "summary": "..."}',
        "- facts: hechos estables del cliente (nombre, preferencias, contexto de negocio). Claves cortas en snake_case en español.",
        `- summary: resumen acumulado de TODAS las conversaciones (previas + esta), máximo ${MEMORY_SUMMARY_MAX_CHARS} caracteres, condensando lo más antiguo.`,
        "No incluyas nada fuera del JSON.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `Memoria previa:\n${JSON.stringify({
            facts: prev.facts.map((f) => ({ key: f.key, value: f.value })),
            summary: prev.summary ?? "",
          })}\n\nTranscript de la conversación:\n${transcript}`,
        },
      ],
      maxTokens: 1500,
    });

    const text = textOf(result);
    const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = extractionSchema.parse(JSON.parse(jsonText));
    const summary = parsed.summary.slice(0, MEMORY_SUMMARY_MAX_CHARS);

    await db.transaction(async (tx) => {
      for (const f of parsed.facts) {
        await tx
          .insert(contactFacts)
          .values({
            tenantId: link.tenantId,
            botId: link.botId,
            channelLinkId: link.id,
            key: f.key,
            value: f.value,
            origin: "bot",
          })
          .onConflictDoUpdate({
            target: [contactFacts.channelLinkId, contactFacts.key],
            set: { value: f.value, origin: "bot", updatedAt: new Date() },
          });
      }
      if (summary) {
        await tx
          .insert(contactMemories)
          .values({
            channelLinkId: link.id,
            tenantId: link.tenantId,
            botId: link.botId,
            summary,
          })
          .onConflictDoUpdate({
            target: contactMemories.channelLinkId,
            set: { summary, updatedAt: new Date() },
          });
      }
      await tx
        .update(conversations)
        .set({ consolidatedAt: new Date() })
        .where(eq(conversations.id, convo.id));
    });
  } catch (e) {
    // P2: memoria previa intacta; se marca para no reintentar en loop (2.3).
    console.error(`[memory] consolidación fallida convo=${convo.id}:`, e);
    await markConsolidated().catch(() => undefined);
  }
}
