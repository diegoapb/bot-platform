import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  bots,
  channelLinks,
  contactFacts,
  contactMemories,
  conversations,
  tenants,
  type ChannelLinkRow,
  type ContactFactRow,
  type ConversationRow,
} from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { generate, textOf } from "../integrations/llm.js";
import { MEMORY_SUMMARY_MAX_CHARS } from "@bot/shared";
import { resolveAgentForBot } from "./agents.js";
import { ensureLinkOwnContact } from "./contact.js";

/**
 * Memoria por cliente (E13/US-033): hechos clave-valor + resumen acumulado,
 * anclados al **contacto unificado** (`contact_id`), compartidos entre los
 * canales del mismo contacto. Aislamiento por tenant/agente vía el contacto (P3).
 */

export type Memory = {
  facts: Array<Pick<ContactFactRow, "key" | "value" | "origin" | "updatedAt">>;
  summary: string | null;
  updatedAt: Date | null;
};

const EMPTY: Memory = { facts: [], summary: null, updatedAt: null };

/** Memoria del contacto unificado (4.1, 4.4). */
export async function getMemory(contactId: string): Promise<Memory> {
  const [facts, [mem]] = await Promise.all([
    db
      .select({
        key: contactFacts.key,
        value: contactFacts.value,
        origin: contactFacts.origin,
        updatedAt: contactFacts.updatedAt,
      })
      .from(contactFacts)
      .where(eq(contactFacts.contactId, contactId)),
    db.select().from(contactMemories).where(eq(contactMemories.contactId, contactId)),
  ]);
  return { facts, summary: mem?.summary ?? null, updatedAt: mem?.updatedAt ?? null };
}

/** Resuelve el contacto de un link, creándolo si faltara (defensivo post-migración). */
export async function contactIdForLink(link: ChannelLinkRow): Promise<string> {
  if (link.contactId) return link.contactId;
  const [bot] = await db.select().from(bots).where(eq(bots.id, link.botId));
  if (!bot) throw new Error(`bot ${link.botId} no existe`);
  const agent = await resolveAgentForBot(bot);
  const { contactId } = await ensureLinkOwnContact({
    tenantId: link.tenantId,
    agentId: agent.id,
    channelLinkId: link.id,
  });
  return contactId;
}

/** Memoria a partir de un channel_link (resuelve su contacto). */
export async function getMemoryForLink(link: ChannelLinkRow): Promise<Memory> {
  if (!link.contactId) return EMPTY;
  return getMemory(link.contactId);
}

/** Upsert idempotente por (contacto, clave) — 4.3, P3. */
export async function upsertFact(
  link: ChannelLinkRow,
  key: string,
  value: string,
  origin: "bot" | "human",
  actorId?: string,
): Promise<void> {
  const contactId = await contactIdForLink(link);
  await db
    .insert(contactFacts)
    .values({
      tenantId: link.tenantId,
      botId: link.botId,
      contactId,
      channelLinkId: link.id,
      key,
      value,
      origin,
      updatedBy: actorId ?? null,
    })
    .onConflictDoUpdate({
      target: [contactFacts.contactId, contactFacts.key],
      set: { value, origin, updatedBy: actorId ?? null, updatedAt: new Date() },
    });
}

export async function deleteFact(link: ChannelLinkRow, key: string): Promise<boolean> {
  if (!link.contactId) return false;
  const rows = await db
    .delete(contactFacts)
    .where(and(eq(contactFacts.contactId, link.contactId), eq(contactFacts.key, key)))
    .returning({ id: contactFacts.id });
  return rows.length > 0;
}

/** Borrado completo e irreversible de la memoria del contacto (3.3). */
export async function wipe(link: ChannelLinkRow): Promise<void> {
  if (!link.contactId) return;
  const contactId = link.contactId;
  await db.transaction(async (tx) => {
    await tx.delete(contactFacts).where(eq(contactFacts.contactId, contactId));
    await tx.delete(contactMemories).where(eq(contactMemories.contactId, contactId));
  });
}

const extractionSchema = z.object({
  facts: z
    .array(z.object({ key: z.string().min(1).max(100), value: z.string().min(1).max(500) }))
    .default([]),
  summary: z.string().default(""),
});

/**
 * Consolidación (E07): el LLM extrae hechos nuevos y reescribe el resumen a
 * partir del transcript + memoria previa. Se ancla al contacto unificado. Ante
 * cualquier fallo, la memoria previa queda intacta (P2) y se marca consolidada.
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
    const contactId = await contactIdForLink(link);

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

    const prev = await getMemory(contactId);
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
            contactId,
            channelLinkId: link.id,
            key: f.key,
            value: f.value,
            origin: "bot",
          })
          .onConflictDoUpdate({
            target: [contactFacts.contactId, contactFacts.key],
            set: { value: f.value, origin: "bot", updatedAt: new Date() },
          });
      }
      if (summary) {
        await tx
          .insert(contactMemories)
          .values({
            channelLinkId: link.id,
            contactId,
            tenantId: link.tenantId,
            botId: link.botId,
            summary,
          })
          .onConflictDoUpdate({
            target: contactMemories.contactId,
            set: { summary, updatedAt: new Date() },
          });
      }
      await tx
        .update(conversations)
        .set({ consolidatedAt: new Date() })
        .where(eq(conversations.id, convo.id));
    });
  } catch (e) {
    console.error(`[memory] consolidación fallida convo=${convo.id}:`, e);
    await markConsolidated().catch(() => undefined);
  }
}
