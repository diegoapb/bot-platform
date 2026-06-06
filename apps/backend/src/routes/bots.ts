import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createBotSchema } from "@bot/shared";
import { db } from "../db/client.js";
import { bots } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

export const botsRoutes = new Hono();

// Todas las rutas de bots requieren sesión Clerk.
botsRoutes.use("*", requireAuth);

/** Lista los bots del usuario autenticado. */
botsRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db.select().from(bots).where(eq(bots.ownerId, userId));
  return c.json({ ok: true, data: rows });
});

/** Crea un bot para el usuario autenticado. */
botsRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const parsed = createBotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "Payload inválido", issues: parsed.error.issues }, 400);
  }
  const [row] = await db
    .insert(bots)
    .values({ ...parsed.data, ownerId: userId })
    .returning();
  return c.json({ ok: true, data: row }, 201);
});

/** Detalle de un bot propio. */
botsRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const [row] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, c.req.param("id")), eq(bots.ownerId, userId)));
  if (!row) return c.json({ ok: false, error: "No encontrado" }, 404);
  return c.json({ ok: true, data: row });
});
