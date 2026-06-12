import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { bots, tenants, webhookEvents } from "../db/schema.js";
import { mapConnectionState } from "../integrations/evolution.js";
import {
  findBotByInstance,
  handleInbound,
  handleAgentReply,
  applyAssigneeHandoff,
} from "../services/message-sync.js";
import { setBotStatus } from "../services/bot-activation.js";
import { findChannelByInbox } from "../services/channels.js";
import { handleChannelMessage, findBotForChannel } from "../services/channel-inbound.js";

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
      // E10: la primera conexión activa el bot (draft → active). Pausas
      // posteriores son decisión explícita del admin y no se tocan aquí.
      if (status === "connected" && bot.status === "draft") {
        await setBotStatus(bot.id, "active", "system:connected");
      }
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
    try {
      await applyAssigneeHandoff(bot, payload);
    } catch (e) {
      console.error("[webhook:chatwoot] conversation_updated", e);
    }
  }

  return c.json({ ok: true });
});

/**
 * Webhook a NIVEL DE CUENTA de Chatwoot (E11/US-022): un webhook por tenant,
 * recibe eventos de todos los inboxes. Solo procesa los inboxes que mapean a
 * un canal nativo (tabla channels); el inbox API del flujo Evolution se
 * atiende por el webhook por bot de arriba y aquí se ignora (sin doble efecto).
 */
webhooks.post("/chatwoot-account/:tenantId", async (c) => {
  const tenantId = c.req.param("tenantId");
  const token = c.req.query("token");

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (
    !tenant ||
    !tenant.chatwootAccountWebhookToken ||
    token !== tenant.chatwootAccountWebhookToken
  ) {
    return c.json({ ok: false, error: "token inválido" }, 401);
  }

  const payload = await c.req.json().catch(() => null);
  if (!payload) return c.json({ ok: true });

  const type: string = payload.event ?? "unknown";
  // message_created trae el inbox en conversation.inbox_id / inbox.id;
  // conversation_updated ES la conversación (inbox_id en la raíz).
  const inboxId: number | undefined =
    payload.conversation?.inbox_id ?? payload.inbox?.id ?? payload.inbox_id;
  if (!inboxId) return c.json({ ok: true });

  const channel = await findChannelByInbox(tenantId, inboxId);
  if (!channel) return c.json({ ok: true });

  await db.insert(webhookEvents).values({
    tenantId,
    botId: channel.botId,
    source: "chatwoot",
    type,
    payload,
  });

  if (type === "message_created") {
    try {
      await handleChannelMessage(channel, payload);
    } catch (e) {
      console.error("[webhook:chatwoot-account] handleChannelMessage", e);
      return c.json({ ok: false }, 500);
    }
  } else if (type === "conversation_updated") {
    try {
      const bot = await findBotForChannel(channel);
      if (bot) await applyAssigneeHandoff(bot, payload);
    } catch (e) {
      console.error("[webhook:chatwoot-account] conversation_updated", e);
    }
  }

  return c.json({ ok: true });
});
