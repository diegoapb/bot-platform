import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { bots, channelLinks, type BotRow, type ChannelRow } from "../db/schema.js";
import { ensureConversation } from "./conversation-state.js";
import { onInboundMessage } from "./reply-engine.js";
import { tryMarkProcessed } from "./message-sync.js";
import { isBotActive } from "./bot-activation.js";

/**
 * Entrada del pipeline agnóstico de canal (E11/US-022): mensajes que Chatwoot
 * recibe de canales nativos (Telegram, WhatsApp Cloud, Instagram, Messenger) y
 * reenvía por el webhook de cuenta. La conversación YA existe en Chatwoot
 * (la creó el canal); aquí solo se mapea al estado propio y se dispara el motor.
 * La respuesta sale por la API de Chatwoot, que la entrega al canal.
 */

/** Identificador estable del contacto para el channel_link de un canal nativo. */
function contactIdentifier(channel: ChannelRow, sender: any): string {
  return (
    sender?.phone_number ??
    sender?.identifier ??
    (sender?.id != null ? `${channel.type}:${sender.id}` : channel.type)
  );
}

export async function handleChannelMessage(channel: ChannelRow, payload: any): Promise<void> {
  // Solo entrantes de cliente. Los outgoing los entrega Chatwoot al canal por
  // sí mismo (incluidos los del bot, marcados from_bot) — nada que reenviar.
  if (payload?.message_type !== "incoming" || payload?.private) return;

  const messageId = payload?.id != null ? String(payload.id) : "";
  const cwConversationId: number | undefined = payload?.conversation?.id;
  if (!messageId || !cwConversationId) return;

  const [bot] = await db.select().from(bots).where(eq(bots.id, channel.botId));
  if (!bot) return;

  if (!(await tryMarkProcessed(bot, "chatwoot", messageId))) return;

  // Mapeo conversación Chatwoot ↔ estado propio. El jid sintético `cw:<id>` es
  // único por conversación de Chatwoot dentro del bot.
  const waJid = `cw:${cwConversationId}`;
  const sender = payload?.sender ?? {};
  let [link] = await db
    .select()
    .from(channelLinks)
    .where(and(eq(channelLinks.botId, bot.id), eq(channelLinks.waJid, waJid)));
  if (!link) {
    const inserted = await db
      .insert(channelLinks)
      .values({
        tenantId: bot.tenantId,
        botId: bot.id,
        channelId: channel.id,
        waJid,
        phoneE164: contactIdentifier(channel, sender),
        cwContactId: Number(sender?.id ?? 0),
        cwConversationId,
      })
      .onConflictDoNothing()
      .returning();
    link =
      inserted[0] ??
      (
        await db
          .select()
          .from(channelLinks)
          .where(and(eq(channelLinks.botId, bot.id), eq(channelLinks.waJid, waJid)))
      )[0];
  }
  if (!link) return;

  const text: string | null = payload?.content ?? null;

  // E10: bot pausado → el mensaje queda en Chatwoot para humanos, sin motor.
  const convo = await ensureConversation(bot.tenantId, bot.id, link.id);
  if (isBotActive(bot)) onInboundMessage(bot, convo, text);
}

export async function findBotForChannel(channel: ChannelRow): Promise<BotRow | null> {
  const [bot] = await db.select().from(bots).where(eq(bots.id, channel.botId));
  return bot ?? null;
}
