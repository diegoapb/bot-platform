import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  bots,
  channelLinks,
  conversations,
  conversationTransitions,
  tenants,
  type ConversationRow,
} from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import type { ConversationMode } from "@bot/shared";

/**
 * Máquina de estados de la conversación (US-012): `bot | human | paused`.
 * Cambios atómicos (FOR UPDATE) + auditoría en conversation_transitions.
 * Las etiquetas de Chatwoot son best-effort: el estado en DB es la verdad.
 */

export type TransitionCause =
  | "llm:request_human"
  | "llm:error"
  | "panel:user"
  | "chatwoot:agent"
  | "system";

export const NEEDS_HUMAN_LABEL = "needs-human";

/** Cambia el modo. Idempotente: mismo modo => no-op sin transición (P3). */
export async function setMode(
  conversationId: string,
  newMode: ConversationMode,
  cause: TransitionCause,
  actorId?: string,
): Promise<{ changed: boolean; from?: ConversationMode }> {
  const result = await db.transaction(async (tx) => {
    const [convo] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .for("update");
    if (!convo) return null;
    if (convo.mode === newMode) return { changed: false as const, convo };

    await tx
      .update(conversations)
      .set({ mode: newMode })
      .where(eq(conversations.id, conversationId));
    await tx.insert(conversationTransitions).values({
      tenantId: convo.tenantId,
      conversationId,
      fromMode: convo.mode,
      toMode: newMode,
      cause,
      actorId: actorId ?? null,
    });
    return { changed: true as const, convo };
  });

  if (!result) return { changed: false };
  if (result.changed) {
    await syncChatwootLabel(result.convo, newMode).catch((e) =>
      console.warn("[conversation-state] label best-effort:", e instanceof Error ? e.message : e),
    );
  }
  return { changed: result.changed, from: result.convo.mode as ConversationMode };
}

/** Refleja el modo como etiqueta/prioridad en Chatwoot (1.3 de US-012). */
async function syncChatwootLabel(convo: ConversationRow, mode: ConversationMode): Promise<void> {
  const [link] = await db
    .select()
    .from(channelLinks)
    .where(eq(channelLinks.id, convo.channelLinkId));
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, convo.tenantId));
  if (!link || !tenant?.chatwootAccountId) return;

  const accountId = tenant.chatwootAccountId;
  const labels = await chatwoot.getLabels(accountId, link.cwConversationId);
  const wants = mode === "human";
  const has = labels.includes(NEEDS_HUMAN_LABEL);
  if (wants && !has) {
    await chatwoot.setLabels(accountId, link.cwConversationId, [...labels, NEEDS_HUMAN_LABEL]);
    await chatwoot.setPriority(accountId, link.cwConversationId, "high").catch(() => undefined);
  } else if (!wants && has) {
    await chatwoot.setLabels(
      accountId,
      link.cwConversationId,
      labels.filter((l) => l !== NEEDS_HUMAN_LABEL),
    );
    await chatwoot.setPriority(accountId, link.cwConversationId, null).catch(() => undefined);
  }
}

export async function getMode(conversationId: string): Promise<ConversationMode | null> {
  const [row] = await db
    .select({ mode: conversations.mode })
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  return (row?.mode as ConversationMode) ?? null;
}

/**
 * Resuelve (o crea) la fila de conversación de un channel_link y registra
 * actividad: actualiza last_msg_at y resetea consolidated_at (E07).
 */
export async function ensureConversation(
  tenantId: string,
  botId: string,
  channelLinkId: string,
): Promise<ConversationRow> {
  const inserted = await db
    .insert(conversations)
    .values({ tenantId, botId, channelLinkId })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  const [row] = await db
    .update(conversations)
    .set({ lastMsgAt: new Date(), consolidatedAt: null })
    .where(eq(conversations.channelLinkId, channelLinkId))
    .returning();
  return row!;
}

const LOCK_TTL_SECONDS = 60;

/** Lock por conversación con TTL (US-011): UPDATE condicional atómico. */
export async function acquireLock(conversationId: string): Promise<boolean> {
  const rows = await db
    .update(conversations)
    .set({ lockedAt: new Date() })
    .where(
      sql`${conversations.id} = ${conversationId} AND (${conversations.lockedAt} IS NULL OR ${conversations.lockedAt} < now() - interval '${sql.raw(String(LOCK_TTL_SECONDS))} seconds')`,
    )
    .returning({ id: conversations.id });
  return rows.length > 0;
}

export async function releaseLock(conversationId: string): Promise<void> {
  await db
    .update(conversations)
    .set({ lockedAt: null })
    .where(eq(conversations.id, conversationId));
}

/** Asegura que el bot dueño de la conversación coincide (aislamiento). */
export async function getConversationForBot(
  conversationId: string,
  tenantId: string,
): Promise<ConversationRow | null> {
  const [row] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!row || row.tenantId !== tenantId) return null;
  return row;
}

export async function getBotForConversation(convo: ConversationRow) {
  const [bot] = await db.select().from(bots).where(eq(bots.id, convo.botId));
  return bot ?? null;
}
