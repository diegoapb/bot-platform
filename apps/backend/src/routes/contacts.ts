import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { upsertFactSchema } from "@bot/shared";
import { db } from "../db/client.js";
import {
  bots,
  botAssignments,
  channelLinks,
  contactFacts,
  contactMemories,
} from "../db/schema.js";
import { requireAuth, requireTenant, requireAdmin, ADMIN_ROLE } from "../middleware/auth.js";
import { getMemory, upsertFact, deleteFact, wipe } from "../services/memory.js";

/**
 * Contactos y su memoria (US-013): lista por bot + gestión de hechos/resumen.
 * Admin edita; member (asignado) solo lectura.
 */
export const contactsRoutes = new Hono();
// Montado en /api: middleware acotado para no interferir con /api/admin.
contactsRoutes.use("/bots/:id/contacts", requireAuth, requireTenant);
contactsRoutes.use("/contacts/*", requireAuth, requireTenant);

async function memberHasBot(c: any, botId: string): Promise<boolean> {
  if (c.get("tenantRole") === ADMIN_ROLE) return true;
  const [assigned] = await db
    .select({ id: botAssignments.id })
    .from(botAssignments)
    .where(and(eq(botAssignments.botId, botId), eq(botAssignments.userId, c.get("userId"))));
  return !!assigned;
}

/** channel_link del tenant actual con permisos del rol; null si no aplica. */
async function getTenantLink(c: any, linkId: string) {
  const tenantId = c.get("tenantId")!;
  const [link] = await db
    .select()
    .from(channelLinks)
    .where(and(eq(channelLinks.id, linkId), eq(channelLinks.tenantId, tenantId)));
  if (!link || !(await memberHasBot(c, link.botId))) return null;
  return link;
}

/** Lista de contactos de un bot con conteo de memoria. */
contactsRoutes.get("/bots/:id/contacts", async (c) => {
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
    .select({
      link: channelLinks,
      factsCount: sql<number>`(SELECT count(*) FROM ${contactFacts} WHERE ${contactFacts.channelLinkId} = ${channelLinks.id})`,
      summary: contactMemories.summary,
      memoryUpdatedAt: contactMemories.updatedAt,
    })
    .from(channelLinks)
    .leftJoin(contactMemories, eq(contactMemories.channelLinkId, channelLinks.id))
    .where(eq(channelLinks.botId, botId))
    .orderBy(desc(channelLinks.createdAt));

  return c.json({
    ok: true,
    data: rows.map((r) => ({
      channelLinkId: r.link.id,
      phoneE164: r.link.phoneE164,
      factsCount: Number(r.factsCount),
      hasSummary: !!r.summary,
      memoryUpdatedAt: r.memoryUpdatedAt?.toISOString() ?? null,
    })),
  });
});

/** Memoria completa de un contacto (3.1). */
contactsRoutes.get("/contacts/:linkId/memory", async (c) => {
  const link = await getTenantLink(c, c.req.param("linkId"));
  if (!link) return c.json({ ok: false, error: "No encontrado" }, 404);
  const memory = await getMemory(link.id);
  return c.json({
    ok: true,
    data: {
      facts: memory.facts.map((f) => ({
        key: f.key,
        value: f.value,
        origin: f.origin,
        updatedAt: f.updatedAt.toISOString(),
      })),
      summary: memory.summary,
      updatedAt: memory.updatedAt?.toISOString() ?? null,
    },
  });
});

/** Crea/edita un hecho con origen humano (3.2). Solo admin. */
contactsRoutes.patch("/contacts/:linkId/memory", requireAdmin, async (c) => {
  const link = await getTenantLink(c, c.req.param("linkId"));
  if (!link) return c.json({ ok: false, error: "No encontrado" }, 404);
  const body = await c.req.json().catch(() => null);
  const parsed = upsertFactSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 422);
  }
  await upsertFact(link.id, parsed.data.key, parsed.data.value, "human", c.get("userId"));
  return c.json({ ok: true, data: { key: parsed.data.key } });
});

/** Elimina un hecho (3.2). Solo admin. */
contactsRoutes.delete("/contacts/:linkId/memory/facts/:key", requireAdmin, async (c) => {
  const link = await getTenantLink(c, c.req.param("linkId"));
  if (!link) return c.json({ ok: false, error: "No encontrado" }, 404);
  const deleted = await deleteFact(link.id, decodeURIComponent(c.req.param("key")));
  if (!deleted) return c.json({ ok: false, error: "Hecho no encontrado" }, 404);
  return c.json({ ok: true, data: { key: c.req.param("key") } });
});

/** Borra TODA la memoria del contacto, irreversible (3.3). Solo admin. */
contactsRoutes.delete("/contacts/:linkId/memory", requireAdmin, async (c) => {
  const link = await getTenantLink(c, c.req.param("linkId"));
  if (!link) return c.json({ ok: false, error: "No encontrado" }, 404);
  await wipe(link.id);
  return c.json({ ok: true, data: { wiped: true } });
});
