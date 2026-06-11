import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { bots, channelLinks, processedMessages, tenants, type BotRow } from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { evolution } from "../integrations/evolution.js";

/**
 * Sincronización bidireccional Evolution ↔ Chatwoot.
 * Idempotencia: insertar en `processed_messages` ANTES de los efectos; el
 * unique constraint (bot, source, external_id) actúa de lock optimista.
 */

/** Inserta el id en processed_messages; false si ya estaba (duplicado). */
async function tryMarkProcessed(
  bot: BotRow,
  source: "evolution" | "chatwoot",
  externalId: string,
): Promise<boolean> {
  const rows = await db
    .insert(processedMessages)
    .values({ tenantId: bot.tenantId, botId: bot.id, source, externalId })
    .onConflictDoNothing()
    .returning({ id: processedMessages.id });
  return rows.length > 0;
}

/** jid de WhatsApp → E.164 ("5491155...@s.whatsapp.net" → "+5491155..."). null si no es numérico. */
export function jidToE164(jid: string): string | null {
  const number = jid.split("@")[0]?.split(":")[0];
  if (!number || !/^\d{7,15}$/.test(number)) return null;
  return `+${number}`;
}

async function accountIdFor(bot: BotRow): Promise<number | null> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, bot.tenantId));
  return tenant?.chatwootAccountId ?? null;
}

/** Mensaje entrante de WhatsApp (webhook Evolution `messages.upsert`) → Chatwoot. */
export async function handleInbound(bot: BotRow, data: any): Promise<void> {
  const key = data?.key ?? {};
  const remoteJid: string | undefined = key.remoteJid;
  const messageId: string | undefined = key.id;
  if (!remoteJid || !messageId) return;

  // Ecos del propio número y grupos quedan fuera del MVP.
  if (key.fromMe || remoteJid.endsWith("@g.us")) return;

  const accountId = await accountIdFor(bot);
  if (!accountId || !bot.chatwootInboxId) {
    console.warn(`[sync] bot ${bot.id} sin Chatwoot provisionado; mensaje ignorado`);
    return;
  }

  const phone = jidToE164(remoteJid);
  if (!phone) {
    console.warn(`[sync] jid no normalizable: ${remoteJid}`);
    return;
  }

  if (!(await tryMarkProcessed(bot, "evolution", messageId))) return;

  let [link] = await db
    .select()
    .from(channelLinks)
    .where(and(eq(channelLinks.botId, bot.id), eq(channelLinks.waJid, remoteJid)));

  if (!link) {
    const contact =
      (await chatwoot.searchContact(accountId, phone)) ??
      (await chatwoot.createContact(accountId, data?.pushName || phone, phone));
    const convo = await chatwoot.createConversation(accountId, bot.chatwootInboxId, contact.id);
    const inserted = await db
      .insert(channelLinks)
      .values({
        tenantId: bot.tenantId,
        botId: bot.id,
        waJid: remoteJid,
        phoneE164: phone,
        cwContactId: contact.id,
        cwConversationId: convo.id,
      })
      .onConflictDoNothing()
      .returning();
    link =
      inserted[0] ??
      (
        await db
          .select()
          .from(channelLinks)
          .where(and(eq(channelLinks.botId, bot.id), eq(channelLinks.waJid, remoteJid)))
      )[0];
  }
  if (!link) return;

  const msg = data?.message ?? {};
  const text: string | null = msg.conversation ?? msg.extendedTextMessage?.text ?? null;
  const body = text ?? `[${data?.messageType ?? "mensaje no textual"} recibido]`;

  await chatwoot.createMessage(accountId, link.cwConversationId, body, "incoming");
}

/** Respuesta de agente en Chatwoot (webhook `message_created` outgoing) → WhatsApp. */
export async function handleAgentReply(bot: BotRow, evt: any): Promise<void> {
  if (evt?.message_type !== "outgoing" || evt?.private) return;
  const messageId = String(evt?.id ?? "");
  const conversationId: number | undefined = evt?.conversation?.id;
  const content: string | undefined = evt?.content;
  if (!messageId || !conversationId || !content || !bot.evolutionInstance) return;

  // Mensajes que el propio backend creó vía API no deben rebotar a WhatsApp.
  // Chatwoot no marca el origen, así que filtramos por sender ausente (API).
  if (!evt?.sender?.id) return;

  if (!(await tryMarkProcessed(bot, "chatwoot", messageId))) return;

  const [link] = await db
    .select()
    .from(channelLinks)
    .where(
      and(eq(channelLinks.botId, bot.id), eq(channelLinks.cwConversationId, conversationId)),
    );
  if (!link) {
    console.warn(`[sync] conversación ${conversationId} sin mapeo para bot ${bot.id}`);
    return;
  }

  try {
    await evolution.sendText(bot.evolutionInstance, link.phoneE164.replace("+", ""), content);
  } catch (e) {
    // Aviso al agente como nota privada; él reintenta manualmente.
    const accountId = await accountIdFor(bot);
    if (accountId) {
      await chatwoot
        .createMessage(
          accountId,
          conversationId,
          `⚠️ No se pudo entregar a WhatsApp: ${e instanceof Error ? e.message : e}`,
          "outgoing",
          { private: true },
        )
        .catch(() => undefined);
    }
    throw e;
  }
}

export async function findBotByInstance(instance: string): Promise<BotRow | null> {
  const [bot] = await db.select().from(bots).where(eq(bots.evolutionInstance, instance));
  return bot ?? null;
}
