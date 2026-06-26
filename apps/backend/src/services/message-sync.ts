import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  bots,
  channelLinks,
  conversations,
  phoneRules,
  processedMessages,
  tenants,
  type BotRow,
} from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { evolution } from "../integrations/evolution.js";
import { provisionChatwoot } from "./chatwoot-provisioning.js";
import { ensureConversation, setMode } from "./conversation-state.js";
import { onInboundMessage } from "./reply-engine.js";
import { isBotActive } from "./bot-activation.js";
import { resolveLegacyForBot } from "./routing/resolve-agent.js";
import { resolveContact } from "./contact.js";
import { normalizeIdentifier } from "./identifier.js";

/**
 * Sincronización bidireccional Evolution ↔ Chatwoot.
 * Idempotencia: insertar en `processed_messages` ANTES de los efectos; el
 * unique constraint (bot, source, external_id) actúa de lock optimista.
 */

/** Inserta el id en processed_messages; false si ya estaba (duplicado). */
export async function tryMarkProcessed(
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

/**
 * Decide si un teléfono queda fuera de la audiencia del bot:
 *  - regla `block` para ese número → bloqueado siempre;
 *  - `whitelistEnabled` y sin regla `allow` → bloqueado (no está en la blanca).
 */
async function isPhoneBlocked(bot: BotRow, phone: string): Promise<boolean> {
  const [rule] = await db
    .select()
    .from(phoneRules)
    .where(and(eq(phoneRules.botId, bot.id), eq(phoneRules.phoneE164, phone)));

  if (rule?.kind === "block") return true;
  if (bot.whitelistEnabled && rule?.kind !== "allow") return true;
  return false;
}

/** Mensaje entrante de WhatsApp (webhook Evolution `messages.upsert`) → Chatwoot. */
export async function handleInbound(bot: BotRow, data: any): Promise<void> {
  const key = data?.key ?? {};
  const remoteJid: string | undefined = key.remoteJid;
  const messageId: string | undefined = key.id;
  if (!remoteJid || !messageId) return;

  // Ecos del propio número y grupos quedan fuera del MVP.
  if (key.fromMe || remoteJid.endsWith("@g.us")) return;

  // Solo chats nuevos: al vincular, WhatsApp empuja mensajes no leídos previos
  // como MESSAGES_UPSERT. Descartamos todo lo anterior a la conexión del bot
  // para no inyectar historial en Chatwoot. messageTimestamp viene en segundos.
  if (bot.lastConnectedAt) {
    const ts = Number(data?.messageTimestamp);
    if (Number.isFinite(ts) && ts * 1000 < bot.lastConnectedAt.getTime()) {
      return;
    }
  }

  const phone = jidToE164(remoteJid);
  if (!phone) {
    console.warn(`[sync] jid no normalizable: ${remoteJid}`);
    return;
  }

  // Lista blanca / negra de audiencia. Bloqueado = ignorar por completo: no se
  // sincroniza a Chatwoot ni se responde. La negra siempre aplica; la blanca
  // solo cuando el bot la tiene activada.
  if (await isPhoneBlocked(bot, phone)) {
    console.info(`[sync] bot ${bot.id}: ${phone} fuera de audiencia; mensaje ignorado`);
    return;
  }

  let accountId = await accountIdFor(bot);
  if (!accountId || !bot.chatwootInboxId) {
    // Auto-reparación: el bot quedó conectado sin inbox (alta a medias). En vez
    // de descartar el mensaje, provisionamos Chatwoot on-demand (idempotente) y
    // recargamos el bot. Si la provisión falla, recién ahí descartamos.
    try {
      const result = await provisionChatwoot(bot);
      accountId = result.accountId;
      const [fresh] = await db.select().from(bots).where(eq(bots.id, bot.id));
      if (fresh) bot = fresh;
    } catch (e) {
      console.warn(
        `[sync] bot ${bot.id} sin Chatwoot y la provisión on-demand falló; mensaje ignorado`,
        e,
      );
      return;
    }
  }
  // Tras la provisión el inbox está garantizado; este guard reasegura el tipo.
  const inboxId = bot.chatwootInboxId;
  if (!accountId || inboxId == null) return;

  if (!(await tryMarkProcessed(bot, "evolution", messageId))) return;

  let [link] = await db
    .select()
    .from(channelLinks)
    .where(and(eq(channelLinks.botId, bot.id), eq(channelLinks.waJid, remoteJid)));

  if (!link) {
    const contact =
      (await chatwoot.searchContact(accountId, phone)) ??
      (await chatwoot.createContact(accountId, data?.pushName || phone, phone));
    const convo = await chatwoot.createConversation(accountId, inboxId, contact.id);
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

  // E13/US-031: resuelve el AGENTE del canal legacy (idempotente, self-healing).
  const { agent } = await resolveLegacyForBot(bot);
  // E13/US-033: resuelve/crea el contacto unificado por identificador (tel).
  await resolveContact({
    tenantId: bot.tenantId,
    agentId: agent.id,
    channelLinkId: link.id,
    identifier: normalizeIdentifier(phone),
  });

  // E06: resuelve la conversación propia (estado/lock, agente fijado) y dispara
  // el motor. El reply del bot se crea vía API (sin sender) → no rebota por el
  // webhook de Chatwoot (anti-loop) ni vuelve a entrar aquí (fromMe filtrado).
  // E10: con el bot pausado el mensaje ya quedó en Chatwoot para atención
  // humana; el motor no se dispara.
  const convo = await ensureConversation(bot.tenantId, bot.id, agent.id, link.id);
  if (isBotActive(bot)) onInboundMessage(convo, text);
}

/** Respuesta de agente en Chatwoot (webhook `message_created` outgoing) → WhatsApp. */
export async function handleAgentReply(bot: BotRow, evt: any): Promise<void> {
  if (evt?.message_type !== "outgoing" || evt?.private) return;
  const messageId = String(evt?.id ?? "");
  const conversationId: number | undefined = evt?.conversation?.id;
  const content: string | undefined = evt?.content;
  if (!messageId || !conversationId || !content || !bot.evolutionInstance) return;

  // Mensajes que el propio backend creó vía API no deben rebotar a WhatsApp.
  // OJO: Chatwoot SÍ les pone sender (el dueño de CHATWOOT_API_TOKEN), así
  // que el origen se marca explícitamente con content_attributes.from_bot al
  // crearlos (reply-engine); el dedupe por id en deliver() es segunda barrera.
  if (evt?.content_attributes?.from_bot) return;

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

/**
 * US-012 (3.1): asignación de agente en Chatwoot → modo human. Compartido por
 * el webhook por bot (inbox API) y el webhook de cuenta (canales E11). La
 * devolución al bot es siempre decisión explícita del panel, no automática.
 */
export async function applyAssigneeHandoff(bot: BotRow, payload: any): Promise<void> {
  const cwConversationId: number | undefined = payload.id ?? payload.conversation?.id;
  const assigneeId = payload.meta?.assignee?.id ?? payload.conversation?.meta?.assignee?.id;
  if (!cwConversationId || !assigneeId) return;

  const [link] = await db
    .select()
    .from(channelLinks)
    .where(
      and(eq(channelLinks.botId, bot.id), eq(channelLinks.cwConversationId, cwConversationId)),
    );
  if (!link) return;
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.channelLinkId, link.id));
  if (convo && convo.mode === "bot") {
    await setMode(convo.id, "human", "chatwoot:agent", String(assigneeId));
  }
}
