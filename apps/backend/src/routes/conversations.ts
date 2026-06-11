import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { setConversationModeSchema } from "@bot/shared";
import { db } from "../db/client.js";
import {
  bots,
  botAssignments,
  channelLinks,
  conversations,
  conversationTransitions,
} from "../db/schema.js";
import { requireAuth, requireTenant, ADMIN_ROLE } from "../middleware/auth.js";
import { setMode } from "../services/conversation-state.js";

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
