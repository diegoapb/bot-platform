import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createAssignmentSchema, tenantRoleSchema, type TenantMember } from "@bot/shared";
import { db } from "../db/client.js";
import { bots, botAssignments } from "../db/schema.js";
import { clerk } from "../lib/clerk.js";
import { requireAuth, requireTenant, requireAdmin } from "../middleware/auth.js";

export const teamRoutes = new Hono();

// Gestión de equipo y asignaciones: solo admin del tenant.
teamRoutes.use("*", requireAuth, requireTenant, requireAdmin);

/** Lista los miembros del tenant (desde las memberships de la organización Clerk). */
teamRoutes.get("/members", async (c) => {
  const tenantId = c.get("tenantId")!;
  const list = await clerk.organizations.getOrganizationMembershipList({
    organizationId: tenantId,
    limit: 100,
  });

  const members: TenantMember[] = list.data.map((m) => {
    const u = m.publicUserData;
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
    return {
      userId: u?.userId ?? "",
      name: name || (u?.identifier ?? "—"),
      email: u?.identifier ?? "",
      role: tenantRoleSchema.catch("org:member").parse(m.role),
      imageUrl: u?.imageUrl ?? null,
    };
  });

  return c.json({ ok: true, data: members });
});

/** Lista las asignaciones bot↔usuario del tenant (opcional ?botId=). */
teamRoutes.get("/assignments", async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.query("botId");
  const where = botId
    ? and(eq(botAssignments.tenantId, tenantId), eq(botAssignments.botId, botId))
    : eq(botAssignments.tenantId, tenantId);
  const rows = await db.select().from(botAssignments).where(where);
  return c.json({ ok: true, data: rows });
});

/** Asigna un miembro a un bot del tenant. Idempotente (ignora duplicados). */
teamRoutes.post("/assignments", async (c) => {
  const tenantId = c.get("tenantId")!;
  const body = await c.req.json().catch(() => null);
  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }

  // El bot debe pertenecer al tenant.
  const [bot] = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.id, parsed.data.botId), eq(bots.tenantId, tenantId)));
  if (!bot) return c.json({ ok: false, error: "Bot no encontrado en el tenant" }, 404);

  const [row] = await db
    .insert(botAssignments)
    .values({ tenantId, botId: parsed.data.botId, userId: parsed.data.userId })
    .onConflictDoNothing({ target: [botAssignments.botId, botAssignments.userId] })
    .returning();

  // Si ya existía, devuelve la fila existente.
  if (!row) {
    const [existing] = await db
      .select()
      .from(botAssignments)
      .where(
        and(
          eq(botAssignments.botId, parsed.data.botId),
          eq(botAssignments.userId, parsed.data.userId),
        ),
      );
    return c.json({ ok: true, data: existing });
  }
  return c.json({ ok: true, data: row }, 201);
});

/** Quita una asignación bot↔usuario del tenant. */
teamRoutes.delete("/assignments/:id", async (c) => {
  const tenantId = c.get("tenantId")!;
  const [row] = await db
    .delete(botAssignments)
    .where(and(eq(botAssignments.id, c.req.param("id")), eq(botAssignments.tenantId, tenantId)))
    .returning({ id: botAssignments.id });
  if (!row) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: { id: row.id } });
});
