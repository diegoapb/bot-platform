import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { env } from "../env.js";

export const health = new Hono();

/**
 * Healthcheck extendido (US-014): reporta DB, Evolution y Chatwoot.
 * Cada check con timeout de 2s y resultado cacheado 30s para no martillar
 * las dependencias (el healthcheck de Docker pega cada pocos segundos).
 * Siempre HTTP 200: `degraded` no debe provocar restarts en loop del
 * contenedor — reiniciar el backend no arregla una dependencia externa.
 */

type Health = {
  status: "ok" | "degraded";
  checks: { db: boolean; evolution: boolean; chatwoot: boolean };
};

const CHECK_TIMEOUT_MS = 2_000;
const CACHE_TTL_MS = 30_000;

let cached: { at: number; value: Health } | null = null;

async function withTimeout(probe: (signal: AbortSignal) => Promise<boolean>): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    return await probe(controller.signal);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function runChecks(): Promise<Health> {
  const [dbOk, evolutionOk, chatwootOk] = await Promise.all([
    withTimeout(async () => {
      await db.execute(sql`select 1`);
      return true;
    }),
    withTimeout(async (signal) => {
      const res = await fetch(env.EVOLUTION_API_URL, { signal });
      return res.ok;
    }),
    withTimeout(async (signal) => {
      // Endpoint público de Chatwoot que no requiere auth.
      const res = await fetch(`${env.CHATWOOT_API_URL}/api`, { signal });
      return res.ok;
    }),
  ]);
  const checks = { db: dbOk, evolution: evolutionOk, chatwoot: chatwootOk };
  // P4: ok ⇔ los 3 checks pasan.
  return { status: dbOk && evolutionOk && chatwootOk ? "ok" : "degraded", checks };
}

health.get("/", async (c) => {
  if (!cached || Date.now() - cached.at > CACHE_TTL_MS) {
    cached = { at: Date.now(), value: await runChecks() };
  }
  return c.json({ ok: true, service: "bot-plataform-backend", ...cached.value });
});

/** Liveness barato (sin tocar dependencias). */
health.get("/live", (c) => c.json({ ok: true }));

/** Readiness: comprueba conexión a Postgres. */
health.get("/ready", async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ ok: true, db: "up" });
  } catch (err) {
    return c.json({ ok: false, db: "down", error: String(err) }, 503);
  }
});
