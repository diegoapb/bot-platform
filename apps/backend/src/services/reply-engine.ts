import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  bots,
  channelLinks,
  conversations,
  generations,
  tenants,
  type BotRow,
  type ConversationRow,
} from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { evolution } from "../integrations/evolution.js";
import { env } from "../env.js";
import { generate, textOf, type LlmMessage, type LlmTool } from "../integrations/llm.js";
import { buildContext } from "./context-builder.js";
import { searchCatalog } from "./catalog.js";
import { acquireLock, releaseLock, setMode } from "./conversation-state.js";
import { tryMarkProcessed } from "./message-sync.js";
import { isBotActive } from "./bot-activation.js";
import { runExtraction } from "./extraction.js";

/**
 * Motor de respuesta automática (US-011) + handoff (US-012).
 * Debounce de ráfagas en memoria (8s) por conversación, lock con TTL en DB,
 * tool-use de catálogo y de escalamiento a humano.
 * Limitación documentada: el buffer es in-process → válido con 1 réplica.
 */

const DEBOUNCE_MS = 8_000;
const MAX_TOOL_ROUNDS = 4;

type Burst = { texts: string[]; timer: NodeJS.Timeout };
const bursts = new Map<string, Burst>();

const TOOLS: LlmTool[] = [
  {
    name: "search_catalog",
    description:
      "Busca productos o servicios del negocio por término (nombre, descripción o atributos). Úsala SIEMPRE antes de afirmar precios o disponibilidad.",
    input_schema: {
      type: "object",
      properties: { term: { type: "string", description: "Término de búsqueda" } },
      required: ["term"],
    },
  },
  {
    name: "request_human",
    description:
      "Transfiere la conversación a una persona del equipo. Úsala cuando el cliente pida hablar con un humano o cuando no puedas responder con la información disponible.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string", description: "Motivo del escalamiento" } },
      required: ["reason"],
    },
  },
];

/**
 * Punto de entrada desde el sync de mensajes (US-007). El mensaje ya está
 * deduplicado; aquí solo se bufferiza la ráfaga y se agenda el procesamiento.
 */
export function onInboundMessage(
  bot: BotRow,
  convo: ConversationRow,
  text: string | null,
): void {
  if (convo.mode !== "bot") return; // 1.4
  const burst = bursts.get(convo.id);
  const texts = burst?.texts ?? [];
  if (text) texts.push(text);
  if (burst) clearTimeout(burst.timer);
  bursts.set(convo.id, {
    texts,
    timer: setTimeout(() => {
      void processBurst(bot.id, convo.id);
    }, DEBOUNCE_MS),
  });
}

async function processBurst(botId: string, conversationId: string): Promise<void> {
  // Drain del buffer; si no hay texto (solo media) no se genera.
  const burst = bursts.get(conversationId);
  if (!burst) return;

  if (!(await acquireLock(conversationId))) {
    // Otra generación en curso: re-agenda; al terminar se reprocesa (2.2).
    burst.timer = setTimeout(() => void processBurst(botId, conversationId), DEBOUNCE_MS);
    return;
  }

  bursts.delete(conversationId);
  const texts = burst.texts;

  try {
    if (texts.length === 0) return;

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    const [bot] = await db.select().from(bots).where(eq(bots.id, botId));
    if (!convo || !bot || convo.mode !== "bot") return; // P2
    // E10: recheck con datos frescos — si pausaron el bot durante el debounce,
    // la ráfaga se descarta sin responder.
    if (!isBotActive(bot)) return;

    await respond(bot, convo, texts);
    // E12: extracción incremental tras la ráfaga (fire-and-forget; no bloquea
    // el lock ni la respuesta). Los fallos quedan logueados dentro.
    void runExtraction(convo);
  } finally {
    await releaseLock(conversationId).catch(() => undefined);
    // Si llegaron mensajes durante la generación, se procesan agrupados.
    if (bursts.get(conversationId)?.texts.length) {
      const pending = bursts.get(conversationId)!;
      clearTimeout(pending.timer);
      pending.timer = setTimeout(() => void processBurst(botId, conversationId), 100);
    }
  }
}

async function respond(bot: BotRow, convo: ConversationRow, texts: string[]): Promise<void> {
  const ctxInfo = await contactInfo(convo);
  const started = Date.now();
  let promptForTrace: unknown = null;

  try {
    const ctx = await buildContext(bot, convo, texts);
    const messages: LlmMessage[] = [...ctx.messages];
    promptForTrace = { system: ctx.system, messages };

    let totalIn = 0;
    let totalOut = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await generate({ system: ctx.system, messages, tools: TOOLS });
      totalIn += result.inputTokens;
      totalOut += result.outputTokens;

      const toolUses = result.content.filter((b) => b.type === "tool_use") as Array<{
        type: "tool_use";
        id: string;
        name: string;
        input: Record<string, unknown>;
      }>;

      const handoff = toolUses.find((t) => t.name === "request_human");
      if (handoff) {
        // P4 (US-012): se descarta cualquier texto del LLM; solo va la plantilla.
        const reason = String(handoff.input?.reason ?? "El bot decidió escalar");
        await setMode(convo.id, "human", "llm:request_human");
        await deliver(bot, convo, ctxInfo, bot.handoffMessage);
        await privateNote(ctxInfo, `🤝 Handoff del bot. Motivo: ${reason}`);
        await trace(bot, convo, {
          prompt: promptForTrace,
          response: `[handoff] ${reason}`,
          inputTokens: totalIn,
          outputTokens: totalOut,
          latencyMs: Date.now() - started,
        });
        return;
      }

      if (result.stopReason === "tool_use" && toolUses.length > 0) {
        messages.push({ role: "assistant", content: result.content as any });
        const results = [] as Array<Record<string, unknown>>;
        for (const t of toolUses) {
          const items = await searchCatalog(bot.id, String(t.input?.term ?? ""));
          results.push({
            type: "tool_result",
            tool_use_id: t.id,
            content: JSON.stringify(
              items.map((i) => ({
                nombre: i.name,
                descripcion: i.description,
                precio: `${i.price} ${i.currency}`,
                disponibilidad: i.availability,
                atributos: i.attributes,
              })),
            ),
          });
        }
        messages.push({ role: "user", content: results });
        continue;
      }

      const text = textOf(result);
      if (!text) throw new Error("El LLM no devolvió texto");

      await deliver(bot, convo, ctxInfo, text);
      await trace(bot, convo, {
        prompt: promptForTrace,
        response: text,
        inputTokens: totalIn,
        outputTokens: totalOut,
        latencyMs: Date.now() - started,
      });
      return;
    }
    throw new Error(`Se excedieron ${MAX_TOOL_ROUNDS} rondas de tool-use`);
  } catch (e) {
    // 3.1: fallo del LLM → conversación a humano + nota privada + traza.
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[engine] fallo en convo ${convo.id}:`, msg);
    await setMode(convo.id, "human", "llm:error").catch(() => undefined);
    await privateNote(
      ctxInfo,
      `⚠️ El bot no pudo responder y transfirió la conversación. Error: ${msg}`,
    ).catch(() => undefined);
    await trace(bot, convo, {
      prompt: promptForTrace,
      error: msg,
      latencyMs: Date.now() - started,
    }).catch(() => undefined);
  }
}

type ContactInfo = {
  accountId: number | null;
  cwConversationId: number | null;
  phone: string | null;
  // E11: link de un canal nativo de Chatwoot → la entrega la hace Chatwoot.
  nativeChannel: boolean;
};

async function contactInfo(convo: ConversationRow): Promise<ContactInfo> {
  const [link] = await db
    .select()
    .from(channelLinks)
    .where(eq(channelLinks.id, convo.channelLinkId));
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, convo.tenantId));
  return {
    accountId: tenant?.chatwootAccountId ?? null,
    cwConversationId: link?.cwConversationId ?? null,
    phone: link?.phoneE164 ?? null,
    nativeChannel: link?.channelId != null,
  };
}

/**
 * Entrega la respuesta por el canal de la conversación (1.3, 3.2 / E11):
 *  - Canal nativo de Chatwoot (Telegram, WhatsApp Cloud, Meta): basta crear el
 *    mensaje outgoing en Chatwoot; Chatwoot lo empuja al canal.
 *  - WhatsApp vía Evolution: se envía por Evolution (1 retry) y se registra en
 *    Chatwoot como espejo.
 */
async function deliver(
  bot: BotRow,
  convo: ConversationRow,
  info: ContactInfo,
  text: string,
): Promise<void> {
  if (info.nativeChannel) {
    if (!info.accountId || !info.cwConversationId) throw new Error("Canal sin mapeo Chatwoot");
    // from_bot evita reprocesar el message_created del webhook (anti-loop).
    const created = await chatwoot.createMessage(
      info.accountId,
      info.cwConversationId,
      text,
      "outgoing",
      { contentAttributes: { from_bot: true } },
    );
    if (created?.id) await tryMarkProcessed(bot, "chatwoot", String(created.id));
    return;
  }

  if (!bot.evolutionInstance || !info.phone) throw new Error("Bot sin instancia o contacto");
  const to = info.phone.replace("+", "");
  try {
    await evolution.sendText(bot.evolutionInstance, to, text);
  } catch {
    try {
      await evolution.sendText(bot.evolutionInstance, to, text);
    } catch (e2) {
      await privateNote(
        info,
        `⚠️ No se pudo entregar la respuesta del bot a WhatsApp. Texto generado:\n\n${text}`,
      ).catch(() => undefined);
      throw e2;
    }
  }
  if (info.accountId && info.cwConversationId) {
    try {
      // from_bot evita que el webhook message_created rebote esta respuesta a
      // WhatsApp (anti-loop); el dedupe por id cubre el caso de que Chatwoot
      // no eche de vuelta los content_attributes.
      const created = await chatwoot.createMessage(
        info.accountId,
        info.cwConversationId,
        text,
        "outgoing",
        { contentAttributes: { from_bot: true } },
      );
      if (created?.id) await tryMarkProcessed(bot, "chatwoot", String(created.id));
    } catch (e) {
      console.warn(
        "[engine] registro en Chatwoot falló:",
        e instanceof Error ? e.message : e,
      );
    }
  }
}

async function privateNote(info: ContactInfo, text: string): Promise<void> {
  if (!info.accountId || !info.cwConversationId) return;
  await chatwoot.createMessage(info.accountId, info.cwConversationId, text, "outgoing", {
    private: true,
  });
}

/** P4 de US-011: toda invocación (éxito o error) deja fila en generations. */
async function trace(
  bot: BotRow,
  convo: ConversationRow,
  data: {
    prompt: unknown;
    response?: string;
    error?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
  },
): Promise<void> {
  await db.insert(generations).values({
    tenantId: bot.tenantId,
    botId: bot.id,
    conversationId: convo.id,
    model: env.LLM_MODEL,
    prompt: data.prompt ?? {},
    response: data.response ?? null,
    error: data.error ?? null,
    inputTokens: data.inputTokens ?? null,
    outputTokens: data.outputTokens ?? null,
    latencyMs: data.latencyMs,
  });
}
