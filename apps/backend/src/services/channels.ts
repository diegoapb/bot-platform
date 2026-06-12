import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Channel, ConnectChannelInput } from "@bot/shared";
import { db } from "../db/client.js";
import { channels, tenants, type BotRow, type ChannelRow } from "../db/schema.js";
import { chatwoot, ChatwootError } from "../integrations/chatwoot.js";
import { env } from "../env.js";
import { ensureChatwootAccount } from "./chatwoot-provisioning.js";

/**
 * Conectores de canal (E11/US-021..025). Cada canal se materializa como un
 * inbox nativo de Chatwoot en la cuenta del tenant; los mensajes entran por el
 * webhook a nivel de cuenta (US-022) y las respuestas salen por la API de
 * Chatwoot, que las entrega al canal. El motor nunca conoce el transporte.
 */

export class ChannelError extends Error {}

const ACCOUNT_WEBHOOK_SUBSCRIPTIONS = ["message_created", "conversation_updated"];

/**
 * Garantiza el webhook a nivel de cuenta del tenant (uno solo, idempotente).
 * Por él entran los eventos de todos los inboxes de canal del tenant.
 */
export async function ensureAccountWebhook(tenantId: string, accountId: number): Promise<void> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (tenant?.chatwootAccountWebhookId != null) return;

  const token = tenant?.chatwootAccountWebhookToken ?? randomUUID();
  const url = `${env.PUBLIC_WEBHOOK_BASE_URL}/webhooks/chatwoot-account/${tenantId}?token=${token}`;
  const created = await chatwoot.createAccountWebhook(accountId, url, ACCOUNT_WEBHOOK_SUBSCRIPTIONS);
  await db
    .update(tenants)
    .set({
      chatwootAccountWebhookId: created.id,
      chatwootAccountWebhookToken: token,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
}

/** Valida el bot token contra la API de Telegram y devuelve el @username. */
async function validateTelegramToken(botToken: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  } catch {
    throw new ChannelError("No se pudo contactar a Telegram. Reintenta.");
  }
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { username?: string };
  };
  if (!res.ok || !json.ok) {
    throw new ChannelError("Bot token de Telegram inválido. Verifícalo con @BotFather.");
  }
  return json.result?.username ? `@${json.result.username}` : "Telegram";
}

/**
 * Conecta un canal: valida credenciales, crea el inbox en Chatwoot y persiste
 * la fila. Si el bot ya tiene un canal de ese tipo desconectado, lo reutiliza.
 */
export async function connectChannel(
  bot: BotRow,
  input: ConnectChannelInput,
  userId: string,
): Promise<ChannelRow> {
  const [existing] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.botId, bot.id), eq(channels.type, input.type)));
  if (existing && existing.status === "connected") {
    throw new ChannelError(`El bot ya tiene un canal ${input.type} conectado`);
  }

  const accountId = await ensureChatwootAccount(bot.tenantId, bot.name);
  await ensureAccountWebhook(bot.tenantId, accountId);

  let inboxId: number;
  let displayName: string;
  let credentials: Record<string, string>;

  try {
    switch (input.type) {
      case "telegram": {
        displayName = await validateTelegramToken(input.botToken);
        const inbox = await chatwoot.createTelegramInbox(
          accountId,
          `${bot.name} · Telegram`,
          input.botToken,
        );
        inboxId = inbox.id;
        credentials = { botToken: input.botToken };
        break;
      }
      case "whatsapp_cloud": {
        const inbox = await chatwoot.createWhatsappCloudInbox(
          accountId,
          `${bot.name} · WhatsApp Cloud`,
          input,
        );
        inboxId = inbox.id;
        displayName = input.phoneNumber;
        credentials = {
          phoneNumber: input.phoneNumber,
          phoneNumberId: input.phoneNumberId,
          businessAccountId: input.businessAccountId,
          apiKey: input.apiKey,
        };
        break;
      }
      case "instagram":
      case "messenger": {
        const inbox = await chatwoot.registerFacebookPage(accountId, {
          pageId: input.pageId,
          userAccessToken: input.userAccessToken,
          pageAccessToken: input.pageAccessToken,
          inboxName: `${bot.name} · ${input.type === "instagram" ? "Instagram" : "Messenger"}`,
        });
        inboxId = inbox.id;
        displayName = input.pageName;
        credentials = { pageId: input.pageId, pageAccessToken: input.pageAccessToken };
        break;
      }
    }
  } catch (e) {
    if (e instanceof ChatwootError) {
      throw new ChannelError(
        e.status === 422
          ? "Chatwoot rechazó las credenciales del canal. Verifícalas."
          : "Chatwoot no disponible. Reintenta.",
      );
    }
    throw e;
  }

  const values = {
    tenantId: bot.tenantId,
    botId: bot.id,
    type: input.type,
    status: "connected" as const,
    credentials,
    chatwootInboxId: inboxId,
    displayName,
    error: null,
    createdBy: userId,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(channels)
    .values(values)
    .onConflictDoUpdate({ target: [channels.botId, channels.type], set: values })
    .returning();
  return row!;
}

/** Desconecta un canal: borra el inbox en Chatwoot (best-effort) y limpia credenciales. */
export async function disconnectChannel(bot: BotRow, channelId: string): Promise<ChannelRow | null> {
  const [channel] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.id, channelId), eq(channels.botId, bot.id)));
  if (!channel) return null;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, bot.tenantId));
  if (tenant?.chatwootAccountId && channel.chatwootInboxId) {
    await chatwoot
      .deleteInbox(tenant.chatwootAccountId, channel.chatwootInboxId)
      .catch((e) =>
        console.warn("[channels] deleteInbox best-effort:", e instanceof Error ? e.message : e),
      );
  }

  const [row] = await db
    .update(channels)
    .set({
      status: "disconnected",
      credentials: {},
      chatwootInboxId: null,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(channels.id, channel.id))
    .returning();
  return row ?? null;
}

/** Canal por inbox de Chatwoot (ruteo del webhook de cuenta). */
export async function findChannelByInbox(
  tenantId: string,
  inboxId: number,
): Promise<ChannelRow | null> {
  const [row] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.tenantId, tenantId), eq(channels.chatwootInboxId, inboxId)));
  return row ?? null;
}

/** Vista para el dashboard: filas reales + canal virtual WhatsApp/Evolution. */
export async function listChannels(bot: BotRow): Promise<Channel[]> {
  const rows = await db.select().from(channels).where(eq(channels.botId, bot.id));
  const evolution: Channel = {
    id: "whatsapp_evolution",
    type: "whatsapp_evolution",
    status: bot.connectionStatus === "connected" ? "connected" : bot.connectionStatus === "qr" ? "qr" : "disconnected",
    displayName: bot.evolutionInstance,
    error: null,
    virtual: true,
    createdAt: null,
  };
  return [
    evolution,
    ...rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      displayName: r.displayName,
      error: r.error,
      virtual: false,
      createdAt: r.createdAt.toISOString(),
    })),
  ];
}
