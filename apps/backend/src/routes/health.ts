import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

export const health = new Hono();

health.get("/", (c) => c.json({ ok: true, service: "bot-plataform-backend" }));

/** Readiness: comprueba conexión a Postgres. */
health.get("/ready", async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ ok: true, db: "up" });
  } catch (err) {
    return c.json({ ok: false, db: "down", error: String(err) }, 503);
  }
});
