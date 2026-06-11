import { Hono } from "hono";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { bots, channelLinks, conversations, generations } from "../db/schema.js";
import { requireAuth, requireTenant, requireAdmin } from "../middleware/auth.js";

/**
 * Trazas de generaciones del LLM (US-014 R3). Solo admin del tenant: los
 * prompts contienen historiales con datos personales de clientes.
 */
export const generationsRoutes = new Hono();
generationsRoutes.use("/bots/:id/generations", requireAuth, requireTenant, requireAdmin);
generationsRoutes.use("/generations/*", requireAuth, requireTenant, requireAdmin);

/** Lista de generaciones de un bot (resumen, sin prompt completo). */
generationsRoutes.get("/bots/:id/generations", async (c) => {
  const tenantId = c.get("tenantId")!;
  const botId = c.req.param("id");
  const [bot] = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.tenantId, tenantId)));
  if (!bot) return c.json({ ok: false, error: "No encontrado" }, 404);

  const limit = Math.min(Number(c.req.query("limit") ?? 30), 100);
  const cursor = c.req.query("cursor"); // ISO date del último ítem
  const conds = [eq(generations.botId, botId)];
  if (cursor) {
    const at = new Date(cursor);
    if (!Number.isNaN(at.getTime())) conds.push(lt(generations.createdAt, at));
  }

  const rows = await db
    .select({
      id: generations.id,
      conversationId: generations.conversationId,
      model: generations.model,
      response: generations.response,
      inputTokens: generations.inputTokens,
      outputTokens: generations.outputTokens,
      latencyMs: generations.latencyMs,
      error: generations.error,
      createdAt: generations.createdAt,
      phoneE164: channelLinks.phoneE164,
    })
    .from(generations)
    .innerJoin(conversations, eq(conversations.id, generations.conversationId))
    .innerJoin(channelLinks, eq(channelLinks.id, conversations.channelLinkId))
    .where(and(...conds))
    .orderBy(desc(generations.createdAt))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  return c.json({
    ok: true,
    data: {
      items: page.map((g) => ({
        id: g.id,
        conversationId: g.conversationId,
        phoneE164: g.phoneE164,
        model: g.model,
        responsePreview: g.response ? g.response.slice(0, 120) : null,
        inputTokens: g.inputTokens,
        outputTokens: g.outputTokens,
        latencyMs: g.latencyMs,
        ok: g.error === null,
        error: g.error,
        createdAt: g.createdAt.toISOString(),
      })),
      nextCursor:
        rows.length > limit ? page[page.length - 1]!.createdAt.toISOString() : null,
    },
  });
});

/** Traza completa: prompt y respuesta (3.2). */
generationsRoutes.get("/generations/:id", async (c) => {
  const tenantId = c.get("tenantId")!;
  const [g] = await db
    .select()
    .from(generations)
    .where(and(eq(generations.id, c.req.param("id")), eq(generations.tenantId, tenantId)));
  if (!g) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({
    ok: true,
    data: {
      id: g.id,
      conversationId: g.conversationId,
      model: g.model,
      prompt: g.prompt,
      response: g.response,
      inputTokens: g.inputTokens,
      outputTokens: g.outputTokens,
      latencyMs: g.latencyMs,
      error: g.error,
      createdAt: g.createdAt.toISOString(),
    },
  });
});
