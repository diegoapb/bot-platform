import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { catalogItemInputSchema, updateCatalogItemSchema } from "@bot/shared";
import { db } from "../db/client.js";
import { bots, botAssignments, type BotRow, type CatalogItemRow } from "../db/schema.js";
import { requireAuth, requireTenant, requireAdmin, ADMIN_ROLE } from "../middleware/auth.js";
import {
  createItem,
  updateItem,
  setArchived,
  listItems,
  importCsv,
  CatalogValidationError,
} from "../services/catalog.js";

/**
 * Catálogo (US-010): montado en /api/bots → /:id/catalog*.
 * Admin escribe (3.2); member (asignado) solo lectura.
 */
export const catalogRoutes = new Hono();
catalogRoutes.use("*", requireAuth, requireTenant);

async function getTenantBot(c: any, botId: string): Promise<BotRow | null> {
  const tenantId = c.get("tenantId")!;
  const [bot] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)));
  if (!bot) return null;
  if (c.get("tenantRole") !== ADMIN_ROLE) {
    const [assigned] = await db
      .select({ id: botAssignments.id })
      .from(botAssignments)
      .where(and(eq(botAssignments.botId, botId), eq(botAssignments.userId, c.get("userId"))));
    if (!assigned) return null;
  }
  return bot;
}

function toDto(row: CatalogItemRow) {
  return {
    id: row.id,
    botId: row.botId,
    name: row.name,
    description: row.description,
    price: row.price,
    currency: row.currency,
    availability: row.availability,
    attributes: row.attributes,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Lista con filtros q/availability (3.1). */
catalogRoutes.get("/:id/catalog", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const rows = await listItems(bot.id, {
    q: c.req.query("q"),
    availability: c.req.query("availability"),
  });
  return c.json({ ok: true, data: rows.map(toDto) });
});

/** Crea ítem (1.1, 1.4). Solo admin. */
catalogRoutes.post("/:id/catalog", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const body = await c.req.json().catch(() => null);
  const parsed = catalogItemInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 422);
  }
  const row = await createItem(bot.tenantId, bot.id, parsed.data);
  return c.json({ ok: true, data: toDto(row) }, 201);
});

/** Edita ítem (1.2). Solo admin. */
catalogRoutes.patch("/:id/catalog/:itemId", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const body = await c.req.json().catch(() => null);
  const parsed = updateCatalogItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 422);
  }
  const row = await updateItem(bot.id, c.req.param("itemId"), parsed.data);
  if (!row) return c.json({ ok: false, error: "Ítem no encontrado" }, 404);
  return c.json({ ok: true, data: toDto(row) });
});

/** Archiva/desarchiva (1.3). Solo admin. */
catalogRoutes.post("/:id/catalog/:itemId/archive", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const archived = body?.archived !== false;
  const row = await setArchived(bot.id, c.req.param("itemId"), archived);
  if (!row) return c.json({ ok: false, error: "Ítem no encontrado" }, 404);
  return c.json({ ok: true, data: toDto(row) });
});

/** Import CSV con reporte por fila (1.5). Solo admin. */
catalogRoutes.post("/:id/catalog/import", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return c.json({ ok: false, error: "Falta el archivo CSV (campo `file`)" }, 422);
  }
  try {
    const report = await importCsv(bot.tenantId, bot.id, await file.text());
    return c.json({ ok: true, data: report });
  } catch (e) {
    if (e instanceof CatalogValidationError) {
      return c.json({ ok: false, error: e.message }, 422);
    }
    throw e;
  }
});
