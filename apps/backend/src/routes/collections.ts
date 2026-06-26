import { Hono } from "hono";
import { createCollectionSchema, updateCollectionSchema, createSourceSchema } from "@bot/shared";
import { requireAuth, requireTenant, requireAdmin } from "../middleware/auth.js";
import * as collections from "../services/collections.js";
import {
  createSource,
  deleteSource,
  listSources,
  reindex,
  KnowledgeValidationError,
  MAX_FILE_BYTES,
  SUPPORTED_MIMES,
} from "../services/knowledge.js";

/**
 * Biblioteca de conocimiento (E13/US-032): CRUD de colecciones reutilizables y
 * gestión de fuentes dentro de una colección. Montado en /api/collections.
 * Escritura: solo admin; lectura: cualquier miembro del tenant. El enlace
 * colección↔agente vive en la API de agentes (/api/agents/:id/collections).
 */
export const collectionsRoutes = new Hono();
collectionsRoutes.use("*", requireAuth, requireTenant);

// --- CRUD de colecciones ----------------------------------------------------

collectionsRoutes.get("/", async (c) => {
  const data = await collections.list(c.get("tenantId")!);
  return c.json({ ok: true, data });
});

collectionsRoutes.post("/", requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "El nombre es obligatorio", issues: parsed.error.issues }, 422);
  }
  try {
    const result = await collections.create(c.get("tenantId")!, parsed.data, c.get("userId"));
    return c.json({ ok: true, data: result }, 201);
  } catch (e) {
    if (e instanceof collections.CollectionError) {
      return c.json({ ok: false, error: e.message }, 422);
    }
    throw e;
  }
});

collectionsRoutes.patch("/:id", requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = updateCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 422);
  }
  try {
    const ok = await collections.update(c.get("tenantId")!, c.req.param("id"), parsed.data);
    if (!ok) return c.json({ ok: false, error: "No encontrada" }, 404);
    return c.json({ ok: true, data: { id: c.req.param("id") } });
  } catch (e) {
    if (e instanceof collections.CollectionError) {
      return c.json({ ok: false, error: e.message }, 422);
    }
    throw e;
  }
});

collectionsRoutes.delete("/:id", requireAdmin, async (c) => {
  const ok = await collections.remove(c.get("tenantId")!, c.req.param("id"));
  if (!ok) return c.json({ ok: false, error: "No encontrada" }, 404);
  return c.json({ ok: true, data: { id: c.req.param("id") } });
});

// --- Fuentes dentro de una colección ----------------------------------------

collectionsRoutes.get("/:id/sources", async (c) => {
  const sources = await listSources(c.get("tenantId")!, c.req.param("id"));
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

collectionsRoutes.post("/:id/sources", requireAdmin, async (c) => {
  const tenantId = c.get("tenantId")!;
  const collectionId = c.req.param("id");
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
        tenantId,
        collectionId,
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
        : { kind: "faq" as const, question: parsed.data.question, answer: parsed.data.answer };
    const result = await createSource(tenantId, collectionId, input, c.get("userId"));
    return c.json({ ok: true, data: result }, 202);
  } catch (e) {
    if (e instanceof KnowledgeValidationError) {
      return c.json({ ok: false, error: e.message }, 422);
    }
    throw e;
  }
});

collectionsRoutes.delete("/:id/sources/:sourceId", requireAdmin, async (c) => {
  const deleted = await deleteSource(c.get("tenantId")!, c.req.param("id"), c.req.param("sourceId"));
  if (!deleted) return c.json({ ok: false, error: "Fuente no encontrada" }, 404);
  return c.json({ ok: true, data: { id: c.req.param("sourceId") } });
});

collectionsRoutes.post("/:id/sources/:sourceId/reindex", requireAdmin, async (c) => {
  const queued = await reindex(c.get("tenantId")!, c.req.param("id"), c.req.param("sourceId"));
  if (!queued) return c.json({ ok: false, error: "Fuente no encontrada" }, 404);
  return c.json({ ok: true, data: { id: c.req.param("sourceId") } }, 202);
});
