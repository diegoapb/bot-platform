import { Hono } from "hono";
import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";
import { setConversationModeSchema } from "@bot/shared";
import { db } from "../db/client.js";
import {
  bots,
  botAssignments,
  channelLinks,
  conversations,
  conversationTransitions,
  tenants,
} from "../db/schema.js";
import { requireAuth, requireTenant, ADMIN_ROLE } from "../middleware/auth.js";
import { setMode } from "../services/conversation-state.js";
import { chatwoot } from "../integrations/chatwoot.js";

/**
 * Conversaciones (US-011/US-012): listado por bot, detalle con transiciones y
 * cambio de modo manual desde el panel. Admin gestiona todo; member solo las
 * conversaciones de bots asignados.
 */
export const conversationsRoutes = new Hono();
// Montado en /api: el middleware se acota a estos paths para no interferir
// con /api/admin (el super admin puede no tener tenant activo).
conversationsRoutes.use("/bots/:id/conversations", requireAuth, requireTenant);
conversationsRoutes.use("/conversations/*", requireAuth, requireTenant);

async function memberHasBot(c: any, botId: string): Promise<boolean> {
  if (c.get("tenantRole") === ADMIN_ROLE) return true;
  const [assigned] = await db
    .select({ id: botAssignments.id })
    .from(botAssignments)
    .where(and(eq(botAssignments.botId, botId), eq(botAssignments.userId, c.get("userId"))));
  return !!assigned;
}

/** Lista conversaciones de un bot con teléfono y modo. */
conversationsRoutes.get("/bots/:id/conversations", async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.param("id");
  const [bot] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)));
  if (!bot || !(await memberHasBot(c, botId))) {
    return c.json({ ok: false, error: "No encontrado" }, 404);
  }
  const rows = await db
    .select({ convo: conversations, link: channelLinks })
    .from(conversations)
    .innerJoin(channelLinks, eq(channelLinks.id, conversations.channelLinkId))
    .where(eq(conversations.botId, botId))
    .orderBy(desc(conversations.lastMsgAt));
  return c.json({
    ok: true,
    data: rows.map((r) => ({
      id: r.convo.id,
      botId: r.convo.botId,
      mode: r.convo.mode,
      phoneE164: r.link.phoneE164,
      lastMsgAt: r.convo.lastMsgAt.toISOString(),
      createdAt: r.convo.createdAt.toISOString(),
    })),
  });
});

/**
 * Lista tenant-wide paginada por cursor (US-014 1.1). Orden estable
 * (last_msg_at DESC, id DESC); cursor = "<ms>_<uuid>" del último ítem (P3).
 * Member: solo conversaciones de bots asignados.
 */
conversationsRoutes.get("/conversations", requireAuth, requireTenant, async (c) => {
  const tenantId = c.get("tenantId")!;
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const botId = c.req.query("botId");
  const mode = c.req.query("mode");
  const cursor = c.req.query("cursor");

  const conds: SQL[] = [eq(conversations.tenantId, tenantId)];
  if (botId) conds.push(eq(conversations.botId, botId));
  if (mode === "bot" || mode === "human" || mode === "paused") {
    conds.push(eq(conversations.mode, mode));
  }
  if (cursor) {
    const [ms, id] = cursor.split("_");
    const at = new Date(Number(ms));
    if (!Number.isNaN(at.getTime()) && id) {
      conds.push(
        or(
          lt(conversations.lastMsgAt, at),
          and(eq(conversations.lastMsgAt, at), sql`${conversations.id} < ${id}`),
        )!,
      );
    }
  }
  if (c.get("tenantRole") !== ADMIN_ROLE) {
    conds.push(
      sql`${conversations.botId} IN (SELECT ${botAssignments.botId} FROM ${botAssignments} WHERE ${botAssignments.userId} = ${c.get("userId")})`,
    );
  }

  const rows = await db
    .select({ convo: conversations, link: channelLinks, botName: bots.name })
    .from(conversations)
    .innerJoin(channelLinks, eq(channelLinks.id, conversations.channelLinkId))
    .innerJoin(bots, eq(bots.id, conversations.botId))
    .where(and(...conds))
    .orderBy(desc(conversations.lastMsgAt), desc(conversations.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return c.json({
    ok: true,
    data: {
      items: page.map((r) => ({
        id: r.convo.id,
        botId: r.convo.botId,
        botName: r.botName,
        mode: r.convo.mode,
        phoneE164: r.link.phoneE164,
        lastMsgAt: r.convo.lastMsgAt.toISOString(),
        createdAt: r.convo.createdAt.toISOString(),
      })),
      nextCursor:
        rows.length > limit && last
          ? `${last.convo.lastMsgAt.getTime()}_${last.convo.id}`
          : null,
    },
  });
});

/** Historial de mensajes con origen cliente/bot/agente (US-014 1.2). */
conversationsRoutes.get("/conversations/:id/messages", async (c) => {
  const tenantId = c.get("tenantId")!;
  const [convo] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, c.req.param("id")), eq(conversations.tenantId, tenantId)));
  if (!convo || !(await memberHasBot(c, convo.botId))) {
    return c.json({ ok: false, error: "No encontrado" }, 404);
  }
  const [link] = await db
    .select()
    .from(channelLinks)
    .where(eq(channelLinks.id, convo.channelLinkId));
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!link || !tenant?.chatwootAccountId) {
    return c.json({ ok: true, data: [] });
  }
  try {
    const raw = await chatwoot.listMessages(tenant.chatwootAccountId, link.cwConversationId);
    const data = raw
      .filter((m) => m.content && !m.private && (m.message_type === 0 || m.message_type === 1))
      .map((m) => ({
        id: m.id,
        content: m.content,
        origin:
          m.message_type === 0
            ? ("cliente" as const)
            : (m.content_attributes as any)?.from_bot
              ? ("bot" as const)
              : ("agente" as const),
        senderName: m.sender?.name ?? null,
        createdAt: new Date(m.created_at * 1000).toISOString(),
      }));
    return c.json({ ok: true, data });
  } catch (e) {
    console.warn("[conversations] mensajes Chatwoot:", e instanceof Error ? e.message : e);
    return c.json({ ok: false, error: "No se pudo cargar el historial desde Chatwoot" }, 502);
  }
});

/** Historial de transiciones de una conversación (4.3). */
conversationsRoutes.get("/conversations/:id/transitions", async (c) => {
  const tenantId = c.get("tenantId")!;
  const [convo] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, c.req.param("id")), eq(conversations.tenantId, tenantId)));
  if (!convo || !(await memberHasBot(c, convo.botId))) {
    return c.json({ ok: false, error: "No encontrado" }, 404);
  }
  const rows = await db
    .select()
    .from(conversationTransitions)
    .where(eq(conversationTransitions.conversationId, convo.id))
    .orderBy(desc(conversationTransitions.createdAt));
  return c.json({
    ok: true,
    data: rows.map((t) => ({
      id: t.id,
      fromMode: t.fromMode,
      toMode: t.toMode,
      cause: t.cause,
      actorId: t.actorId,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

/** Cambia el modo (3.1–3.3). Admin siempre; member solo con bot asignado. */
conversationsRoutes.post("/conversations/:id/mode", async (c) => {
  const tenantId = c.get("tenantId")!;
  const [convo] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, c.req.param("id")), eq(conversations.tenantId, tenantId)));
  if (!convo) return c.json({ ok: false, error: "No encontrado" }, 404);
  if (!(await memberHasBot(c, convo.botId))) {
    return c.json({ ok: false, error: "Sin acceso a este bot" }, 403);
  }
  // Pausar es decisión de admin (3.3).
  const body = await c.req.json().catch(() => null);
  const parsed = setConversationModeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 422);
  }
  if (parsed.data.mode === "paused" && c.get("tenantRole") !== ADMIN_ROLE) {
    return c.json({ ok: false, error: "Pausar requiere rol de administrador" }, 403);
  }
  const result = await setMode(convo.id, parsed.data.mode, "panel:user", c.get("userId"));
  return c.json({ ok: true, data: { mode: parsed.data.mode, changed: result.changed } });
});
