import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createSourceSchema, knowledgeSearchSchema } from "@bot/shared";
import { db } from "../db/client.js";
import { bots, botAssignments, type BotRow } from "../db/schema.js";
import { requireAuth, requireTenant, requireAdmin, ADMIN_ROLE } from "../middleware/auth.js";
import {
  createSource,
  deleteSource,
  listSources,
  reindex,
  retrieve,
  KnowledgeValidationError,
  MAX_FILE_BYTES,
  SUPPORTED_MIMES,
} from "../services/knowledge.js";
import { EmbeddingsError } from "../integrations/embeddings.js";

/**
 * Base de conocimiento (US-009): montado en /api/bots → /:id/knowledge*.
 * Admin escribe; member (asignado) lee y prueba búsquedas.
 */
export const knowledgeRoutes = new Hono();
knowledgeRoutes.use("*", requireAuth, requireTenant);

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

/** Lista de fuentes con estado (4.1). */
knowledgeRoutes.get("/:id/knowledge", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const sources = await listSources(bot.id);
  return c.json({
    ok: true,
    data: sources.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      status: s.status,
      error: s.error,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
});

/** Crea fuente de texto/FAQ (JSON) o archivo (multipart). Solo admin (1.1–1.4). */
knowledgeRoutes.post("/:id/knowledge", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  const contentType = c.req.header("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await c.req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return c.json({ ok: false, error: "Falta el archivo (campo `file`)" }, 422);
      }
      if (file.size > MAX_FILE_BYTES) {
        return c.json({ ok: false, error: "El archivo supera el máximo de 10 MB" }, 422);
      }
      const mime = file.type || "text/plain";
      if (!SUPPORTED_MIMES[mime]) {
        return c.json({ ok: false, error: `Formato no soportado: ${mime}` }, 422);
      }
      const title = String(form.get("title") ?? file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await createSource(
        bot.tenantId,
        bot.id,
        { kind: "file", title, buffer, mime },
        c.get("userId"),
      );
      return c.json({ ok: true, data: result }, 202);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = createSourceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 422);
    }
    const input =
      parsed.data.kind === "text"
        ? { kind: "text" as const, title: parsed.data.title, content: parsed.data.content }
        : {
            kind: "faq" as const,
            question: parsed.data.question,
            answer: parsed.data.answer,
          };
    const result = await createSource(bot.tenantId, bot.id, input, c.get("userId"));
    return c.json({ ok: true, data: result }, 202);
  } catch (e) {
    if (e instanceof KnowledgeValidationError) {
      return c.json({ ok: false, error: e.message }, 422);
    }
    throw e;
  }
});

/** Elimina la fuente y sus chunks (1.5). Solo admin. */
knowledgeRoutes.delete("/:id/knowledge/:sourceId", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const deleted = await deleteSource(bot.id, c.req.param("sourceId"));
  if (!deleted) return c.json({ ok: false, error: "Fuente no encontrada" }, 404);
  return c.json({ ok: true, data: { id: c.req.param("sourceId") } });
});

/** Reintenta el indexado (2.3). Solo admin. */
knowledgeRoutes.post("/:id/knowledge/:sourceId/reindex", requireAdmin, async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const queued = await reindex(bot.id, c.req.param("sourceId"));
  if (!queued) return c.json({ ok: false, error: "Fuente no encontrada" }, 404);
  return c.json({ ok: true, data: { id: c.req.param("sourceId") } }, 202);
});

/** Playground de búsqueda (4.2): chunks con score. */
knowledgeRoutes.post("/:id/knowledge/search", async (c) => {
  const bot = await getTenantBot(c, c.req.param("id"));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);
  const body = await c.req.json().catch(() => null);
  const parsed = knowledgeSearchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 422);
  }
  try {
    const chunks = await retrieve(bot.id, parsed.data.query, parsed.data.k ?? 5);
    return c.json({ ok: true, data: chunks });
  } catch (e) {
    if (e instanceof EmbeddingsError) {
      return c.json({ ok: false, error: `Embeddings no disponibles: ${e.message}` }, 502);
    }
    throw e;
  }
});
