import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { channelLinks, tenants, type ConversationRow, type BotRow } from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { compileIdentity } from "./identity.js";
import { retrieve, type ScoredChunk } from "./knowledge.js";
import { getMemory } from "./memory.js";
import type { LlmMessage } from "../integrations/llm.js";

/**
 * Construye el contexto del LLM (US-011 T3): identidad compilada + memoria del
 * contacto (US-013) + chunks de conocimiento + historial reciente de Chatwoot.
 * Truncamiento por presupuesto: primero knowledge, luego history.
 */

export type BuiltContext = {
  system: string;
  messages: LlmMessage[];
  knowledge: ScoredChunk[];
};

const MAX_KNOWLEDGE_CHUNKS = 5;
const MAX_HISTORY_MESSAGES = 20;
// Presupuesto grosero en caracteres (~4 chars/token).
const KNOWLEDGE_BUDGET_CHARS = 8_000;
const HISTORY_BUDGET_CHARS = 12_000;

export async function buildContext(
  bot: BotRow,
  convo: ConversationRow,
  pendingTexts: string[],
): Promise<BuiltContext> {
  const [link] = await db
    .select()
    .from(channelLinks)
    .where(eq(channelLinks.id, convo.channelLinkId));

  const query = pendingTexts.join("\n").slice(0, 2000);

  const [identity, memory, knowledge] = await Promise.all([
    compileIdentity(bot.id),
    link ? getMemory(link.id) : Promise.resolve({ facts: [], summary: null, updatedAt: null }),
    retrieve(bot.id, query, MAX_KNOWLEDGE_CHUNKS).catch((e) => {
      // Sin embeddings configurados el bot responde solo con identidad+catálogo.
      console.warn("[context] retrieve falló:", e instanceof Error ? e.message : e);
      return [] as ScoredChunk[];
    }),
  ]);

  const sections: string[] = [];
  sections.push(
    identity ||
      "Eres un asistente de atención al cliente por WhatsApp. Responde breve y útil.",
  );

  sections.push(
    [
      "## Instrucciones de canal",
      "- Respondes por un canal de mensajería (WhatsApp, Telegram, Instagram…): mensajes breves, claros y en el idioma del cliente.",
      "- Usa la herramienta `search_catalog` para consultar precios y disponibilidad antes de afirmarlos.",
      "- Si el cliente pide hablar con una persona, o no puedes responder con la información disponible, usa la herramienta `request_human` con el motivo. No inventes información.",
    ].join("\n"),
  );

  if (memory.facts.length > 0 || memory.summary) {
    const factLines = memory.facts.map((f) => `- ${f.key}: ${f.value}`).join("\n");
    sections.push(
      `## Lo que sabes de este cliente\n${factLines}${
        memory.summary ? `\n\nResumen de conversaciones anteriores:\n${memory.summary}` : ""
      }`,
    );
  }

  if (knowledge.length > 0) {
    let used = 0;
    const included: string[] = [];
    for (const chunk of knowledge) {
      if (used + chunk.content.length > KNOWLEDGE_BUDGET_CHARS) break;
      used += chunk.content.length;
      included.push(chunk.content);
    }
    if (included.length < knowledge.length) {
      console.warn(
        `[context] knowledge truncado: ${included.length}/${knowledge.length} chunks`,
      );
    }
    if (included.length > 0) {
      sections.push(
        `## Conocimiento del negocio (relevante a la consulta)\n${included
          .map((c) => `---\n${c}`)
          .join("\n")}`,
      );
    }
  }

  const history = await fetchHistory(bot, convo);
  const messages: LlmMessage[] = [...history];
  // Los mensajes pendientes de la ráfaga van como último turno del usuario.
  messages.push({ role: "user", content: pendingTexts.join("\n") });

  return { system: sections.join("\n\n"), messages, knowledge };
}

/** Historial reciente desde Chatwoot, alternancia user/assistant válida. */
async function fetchHistory(bot: BotRow, convo: ConversationRow): Promise<LlmMessage[]> {
  try {
    const [link] = await db
      .select()
      .from(channelLinks)
      .where(eq(channelLinks.id, convo.channelLinkId));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, bot.tenantId));
    if (!link || !tenant?.chatwootAccountId) return [];

    const raw = await chatwoot.listMessages(tenant.chatwootAccountId, link.cwConversationId);
    // message_type: 0 incoming (cliente), 1 outgoing (bot/agente). Privados fuera.
    const turns = raw
      .filter((m) => !m.private && m.content && (m.message_type === 0 || m.message_type === 1))
      .slice(-MAX_HISTORY_MESSAGES);

    let used = 0;
    const out: LlmMessage[] = [];
    for (let i = turns.length - 1; i >= 0; i--) {
      const m = turns[i]!;
      const content = m.content!;
      if (used + content.length > HISTORY_BUDGET_CHARS) break;
      used += content.length;
      out.unshift({ role: m.message_type === 0 ? "user" : "assistant", content });
    }
    // Fusiona turnos consecutivos del mismo rol (el API exige alternancia).
    const merged: LlmMessage[] = [];
    for (const m of out) {
      const last = merged[merged.length - 1];
      if (last && last.role === m.role) {
        last.content = `${last.content}\n${m.content}`;
      } else {
        merged.push({ ...m });
      }
    }
    // El último turno del historial no puede ser user (se añade la ráfaga después).
    if (merged.length > 0 && merged[merged.length - 1]!.role === "user") merged.pop();
    if (merged.length > 0 && merged[0]!.role === "assistant") merged.shift();
    return merged;
  } catch (e) {
    console.warn("[context] historial Chatwoot falló:", e instanceof Error ? e.message : e);
    return [];
  }
}
