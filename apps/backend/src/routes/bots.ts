import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createBotSchema, updateBotSchema } from "@bot/shared";
import { db } from "../db/client.js";
import { bots, botAssignments } from "../db/schema.js";
import { requireAuth, requireTenant, requireAdmin, ADMIN_ROLE } from "../middleware/auth.js";

export const botsRoutes = new Hono();

// Todas las rutas de bots requieren sesión + tenant activo.
botsRoutes.use("*", requireAuth, requireTenant);

function isAdmin(role: string | null) {
  return role === ADMIN_ROLE;
}

/** Lista bots del tenant. Admin → todos; member → solo los asignados. */
botsRoutes.get("/", async (c) => {
  const tenantId = c.get("tenantId")!;
  const userId = c.get("userId");

  if (isAdmin(c.get("tenantRole"))) {
    const rows = await db.select().from(bots).where(eq(bots.tenantId, tenantId));
    return c.json({ ok: true, data: rows });
  }

  const rows = await db
    .select({ bot: bots })
    .from(bots)
    .innerJoin(botAssignments, eq(botAssignments.botId, bots.id))
    .where(and(eq(bots.tenantId, tenantId), eq(botAssignments.userId, userId)));
  return c.json({ ok: true, data: rows.map((r) => r.bot) });
});

/** Crea un bot en el tenant. Solo admin. */
botsRoutes.post("/", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const body = await c.req.json().catch(() => null);
  const parsed = createBotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }
  const [row] = await db
    .insert(bots)
    .values({ ...parsed.data, tenantId, createdBy: c.get("userId") })
    .returning();
  return c.json({ ok: true, data: row }, 201);
});

/** Detalle de un bot. Admin o miembro asignado. */
botsRoutes.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.param("id");

  const [row] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)));
  if (!row) return c.json({ ok: false, error: "No encontrado" }, 404);

  if (!isAdmin(c.get("tenantRole"))) {
    const [assigned] = await db
      .select({ id: botAssignments.id })
      .from(botAssignments)
      .where(and(eq(botAssignments.botId, botId), eq(botAssignments.userId, c.get("userId"))));
    if (!assigned) return c.json({ ok: false, error: "Sin acceso a este bot" }, 403);
  }

  return c.json({ ok: true, data: row });
});

/** Actualiza un bot del tenant. Solo admin. */
botsRoutes.patch("/:id", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateBotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }
  const [row] = await db
    .update(bots)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)))
    .returning();
  if (!row) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: row });
});

/** Elimina un bot del tenant (y sus asignaciones, en cascada). Solo admin. */
botsRoutes.delete("/:id", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.param("id");
  const [row] = await db
    .delete(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)))
    .returning({ id: bots.id });
  if (!row) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: { id: row.id } });
});
