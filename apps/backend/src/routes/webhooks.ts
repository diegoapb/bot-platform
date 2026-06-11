import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { bots, channelLinks, conversations, webhookEvents } from "../db/schema.js";
import { mapConnectionState } from "../integrations/evolution.js";
import { findBotByInstance, handleInbound, handleAgentReply } from "../services/message-sync.js";
import { setMode } from "../services/conversation-state.js";

/**
 * Webhooks ENTRANTES.
 *  - Evolution: POST /webhooks/evolution/:instance, header `x-webhook-token`
 *    (configurado al crear la instancia) = EVOLUTION_WEBHOOK_TOKEN.
 *  - Chatwoot: POST /webhooks/chatwoot/:botId?token=… (token por bot, generado
 *    en la provisión del inbox).
 * Siempre 200 ante eventos desconocidos para evitar tormentas de reintentos;
 * 401 sin escritura si el token no valida (P1 de US-005).
 */
export const webhooks = new Hono();

webhooks.post("/evolution/:instance", async (c) => {
  const token = c.req.header("x-webhook-token") ?? c.req.query("token");
  if (token !== env.EVOLUTION_WEBHOOK_TOKEN) {
    return c.json({ ok: false, error: "token inválido" }, 401);
  }

  const instance = c.req.param("instance");
  const payload = await c.req.json().catch(() => null);
  if (!payload) return c.json({ ok: true });

  const bot = await findBotByInstance(instance);
  if (!bot) {
    console.warn(`[webhook:evolution] instancia desconocida: ${instance}`);
    return c.json({ ok: true });
  }

  // Evolution emite "CONNECTION_UPDATE" o "connection.update" según versión.
  const type = String(payload.event ?? "unknown").toLowerCase().replace(/_/g, ".");
  await db.insert(webhookEvents).values({
    tenantId: bot.tenantId,
    botId: bot.id,
    source: "evolution",
    type,
    payload,
  });

  if (type === "connection.update") {
    const state: string = payload.data?.state ?? "";
    if (state) {
      const status = mapConnectionState(state);
      await db
        .update(bots)
        .set({
          connectionStatus: status,
          ...(status === "connected" ? { lastConnectedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(bots.id, bot.id));
    }
  } else if (type === "qrcode.updated") {
    await db
      .update(bots)
      .set({ connectionStatus: "qr", updatedAt: new Date() })
      .where(eq(bots.id, bot.id));
  } else if (type === "messages.upsert") {
    try {
      await handleInbound(bot, payload.data);
    } catch (e) {
      console.error("[webhook:evolution] handleInbound", e);
      // 500 → Evolution reintenta; el dedupe evita duplicados.
      return c.json({ ok: false }, 500);
    }
  }

  return c.json({ ok: true });
});

webhooks.post("/chatwoot/:botId", async (c) => {
  const botId = c.req.param("botId");
  const token = c.req.query("token");

  const [bot] = await db.select().from(bots).where(eq(bots.id, botId));
  if (!bot || !bot.chatwootWebhookToken || token !== bot.chatwootWebhookToken) {
    return c.json({ ok: false, error: "token inválido" }, 401);
  }

  const payload = await c.req.json().catch(() => null);
  if (!payload) return c.json({ ok: true });

  const type: string = payload.event ?? "unknown";
  await db.insert(webhookEvents).values({
    tenantId: bot.tenantId,
    botId: bot.id,
    source: "chatwoot",
    type,
    payload,
  });

  if (type === "message_created") {
    try {
      await handleAgentReply(bot, payload);
    } catch (e) {
      console.error("[webhook:chatwoot] handleAgentReply", e);
      return c.json({ ok: false }, 500);
    }
  } else if (type === "conversation_updated") {
    // US-012 (3.1): asignación de agente en Chatwoot → modo human. La
    // devolución al bot es siempre una decisión explícita (panel), no automática.
    try {
      const cwConversationId: number | undefined = payload.id ?? payload.conversation?.id;
      const assigneeId = payload.meta?.assignee?.id ?? payload.conversation?.meta?.assignee?.id;
      if (cwConversationId && assigneeId) {
        const [link] = await db
          .select()
          .from(channelLinks)
          .where(
            and(
              eq(channelLinks.botId, bot.id),
              eq(channelLinks.cwConversationId, cwConversationId),
            ),
          );
        if (link) {
          const [convo] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.channelLinkId, link.id));
          if (convo && convo.mode === "bot") {
            await setMode(convo.id, "human", "chatwoot:agent", String(assigneeId));
          }
        }
      }
    } catch (e) {
      console.error("[webhook:chatwoot] conversation_updated", e);
    }
  }

  return c.json({ ok: true });
});
