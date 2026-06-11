import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { identityTypeSchema, saveIdentitySchema, type IdentityType } from "@bot/shared";
import { db } from "../db/client.js";
import { bots, botAssignments } from "../db/schema.js";
import { requireAuth, requireTenant, requireAdmin, ADMIN_ROLE } from "../middleware/auth.js";
import * as identity from "../services/identity.js";

/**
 * Identidad del agente (E04 / US-008). Montado en /api/bots, rutas
 * /:id/identity*. Lectura: admin o miembro asignado; escritura: solo admin.
 */
export const identityRoutes = new Hono();

identityRoutes.use("*", requireAuth, requireTenant);

async function canAccessBot(c: any, botId: string): Promise<boolean> {
  const tenantId = c.get("tenantId")!;
  const [bot] = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)));
  if (!bot) return false;
  if (c.get("tenantRole") === ADMIN_ROLE) return true;
  const [assigned] = await db
    .select({ id: botAssignments.id })
    .from(botAssignments)
    .where(and(eq(botAssignments.botId, botId), eq(botAssignments.userId, c.get("userId"))));
  return !!assigned;
}

function parseType(raw: string): IdentityType | null {
  const parsed = identityTypeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Documentos vigentes por tipo (null si nunca se guardó). */
identityRoutes.get("/:id/identity", async (c) => {
  const botId = c.req.param("id");
  if (!(await canAccessBot(c, botId))) return c.json({ ok: false, error: "No encontrado" }, 404);
  const current = await identity.getCurrent(botId);
  const data = Object.fromEntries(
    Object.entries(current).map(([type, doc]) => [
      type,
      doc
        ? {
            type,
            version: doc.version,
            content: doc.content,
            createdBy: doc.createdBy,
            createdAt: doc.createdAt.toISOString(),
          }
        : null,
    ]),
  );
  return c.json({ ok: true, data });
});

/** Guarda una nueva versión del documento. Solo admin. */
identityRoutes.put("/:id/identity/:type", requireAdmin, async (c) => {
  const botId = c.req.param("id");
  if (!(await canAccessBot(c, botId))) return c.json({ ok: false, error: "No encontrado" }, 404);
  const type = parseType(c.req.param("type"));
  if (!type) return c.json({ ok: false, error: "Tipo de documento inválido" }, 422);

  const body = await c.req.json().catch(() => null);
  const parsed = saveIdentitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Contenido inválido (máx 20.000 caracteres)" }, 422);
  }

  const result = await identity.save(
    c.get("tenantId")!,
    botId,
    type,
    parsed.data.content,
    c.get("userId"),
  );
  return c.json({ ok: true, data: result });
});

/** Historial de versiones de un documento. */
identityRoutes.get("/:id/identity/:type/versions", async (c) => {
  const botId = c.req.param("id");
  if (!(await canAccessBot(c, botId))) return c.json({ ok: false, error: "No encontrado" }, 404);
  const type = parseType(c.req.param("type"));
  if (!type) return c.json({ ok: false, error: "Tipo de documento inválido" }, 422);

  const versions = await identity.listVersions(botId, type);
  return c.json({
    ok: true,
    data: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
  });
});

/** Restaura una versión: inserta una nueva con ese contenido. Solo admin. */
identityRoutes.post("/:id/identity/:type/versions/:v/restore", requireAdmin, async (c) => {
  const botId = c.req.param("id");
  if (!(await canAccessBot(c, botId))) return c.json({ ok: false, error: "No encontrado" }, 404);
  const type = parseType(c.req.param("type"));
  if (!type) return c.json({ ok: false, error: "Tipo de documento inválido" }, 422);
  const version = Number(c.req.param("v"));
  if (!Number.isInteger(version) || version < 1) {
    return c.json({ ok: false, error: "Versión inválida" }, 422);
  }

  const result = await identity.restore(
    c.get("tenantId")!,
    botId,
    type,
    version,
    c.get("userId"),
  );
  if (!result) return c.json({ ok: false, error: "Versión no encontrada" }, 404);
  return c.json({ ok: true, data: result });
});
