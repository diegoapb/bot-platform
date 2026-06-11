import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import {
  createTenantSchema,
  blockTenantSchema,
  type AdminTenant,
} from "@bot/shared";
import { db } from "../db/client.js";
import { bots, generations, tenants } from "../db/schema.js";
import { clerk } from "../lib/clerk.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";

export const adminRoutes = new Hono();

// Todo el área de plataforma requiere super admin.
adminRoutes.use("*", requireAuth, requireSuperAdmin);

/** Lista todos los tenants (organizaciones) con métricas y estado. */
adminRoutes.get("/tenants", async (c) => {
  const orgs = await clerk.organizations.getOrganizationList({
    limit: 200,
    includeMembersCount: true,
  });

  // Conteo de bots por tenant (desde nuestra DB).
  const botRows = await db
    .select({ tenantId: bots.tenantId, count: sql<number>`count(*)::int` })
    .from(bots)
    .groupBy(bots.tenantId);
  const botCounts = new Map(botRows.map((r) => [r.tenantId, r.count]));

  // Flags de bloqueo (desde nuestra DB).
  const flagRows = await db.select().from(tenants);
  const flags = new Map(flagRows.map((r) => [r.id, r]));

  const data: AdminTenant[] = orgs.data.map((o) => {
    const flag = flags.get(o.id);
    return {
      id: o.id,
      name: o.name,
      slug: o.slug ?? null,
      imageUrl: o.imageUrl ?? null,
      membersCount: o.membersCount ?? 0,
      botsCount: botCounts.get(o.id) ?? 0,
      blocked: flag?.blocked ?? false,
      blockedReason: flag?.blockedReason ?? null,
      createdAt: new Date(o.createdAt).toISOString(),
    };
  });

  return c.json({ ok: true, data });
});

/** Crea un nuevo tenant (organización). El super admin queda como creador. */
adminRoutes.post("/tenants", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }
  const org = await clerk.organizations.createOrganization({
    name: parsed.data.name,
    slug: parsed.data.slug,
    createdBy: c.get("userId"),
  });
  return c.json({ ok: true, data: { id: org.id, name: org.name } }, 201);
});

/** Bloquea un tenant: impide el acceso de sus miembros hasta desbloquearlo. */
adminRoutes.post("/tenants/:id/block", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = blockTenantSchema.safeParse(body);
  const reason = parsed.success ? (parsed.data.reason ?? null) : null;

  await db
    .insert(tenants)
    .values({ id, blocked: true, blockedReason: reason })
    .onConflictDoUpdate({
      target: tenants.id,
      set: { blocked: true, blockedReason: reason, updatedAt: new Date() },
    });

  // Reflejar también en Clerk para visibilidad (best-effort).
  try {
    await clerk.organizations.updateOrganization(id, {
      publicMetadata: { blocked: true },
    });
  } catch {
    // El bloqueo se aplica desde nuestra DB aunque Clerk falle.
  }

  return c.json({ ok: true, data: { id, blocked: true } });
});

/** Desbloquea un tenant. */
adminRoutes.post("/tenants/:id/unblock", async (c) => {
  const id = c.req.param("id");
  await db
    .insert(tenants)
    .values({ id, blocked: false, blockedReason: null })
    .onConflictDoUpdate({
      target: tenants.id,
      set: { blocked: false, blockedReason: null, updatedAt: new Date() },
    });

  try {
    await clerk.organizations.updateOrganization(id, {
      publicMetadata: { blocked: false },
    });
  } catch {
    /* idem */
  }

  return c.json({ ok: true, data: { id, blocked: false } });
});

/**
 * Trazas de generaciones de cualquier tenant (US-014 3.3). Solo super admin;
 * filtro opcional ?tenantId=…
 */
adminRoutes.get("/generations", async (c) => {
  const tenantId = c.req.query("tenantId");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const rows = await db
    .select()
    .from(generations)
    .where(tenantId ? eq(generations.tenantId, tenantId) : undefined)
    .orderBy(desc(generations.createdAt))
    .limit(limit);
  return c.json({
    ok: true,
    data: rows.map((g) => ({
      id: g.id,
      tenantId: g.tenantId,
      botId: g.botId,
      conversationId: g.conversationId,
      model: g.model,
      responsePreview: g.response ? g.response.slice(0, 120) : null,
      inputTokens: g.inputTokens,
      outputTokens: g.outputTokens,
      latencyMs: g.latencyMs,
      ok: g.error === null,
      error: g.error,
      createdAt: g.createdAt.toISOString(),
    })),
  });
});
