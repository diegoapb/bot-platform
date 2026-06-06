import { Hono } from "hono";
import { env } from "../env.js";

/**
 * Webhooks ENTRANTES desde Evolution API y Chatwoot.
 * Registra estas URLs en cada servicio apuntando a este backend, p.ej.:
 *   Evolution: https://api.bots.diegop.com/webhooks/evolution
 *   Chatwoot:  https://api.bots.diegop.com/webhooks/chatwoot
 * Protección simple: query/header `?secret=` que comparamos con WEBHOOK_SECRET.
 */
export const webhooks = new Hono();

function checkSecret(secret: string | undefined): boolean {
  return !!secret && secret === env.WEBHOOK_SECRET;
}

webhooks.post("/evolution", async (c) => {
  const secret = c.req.query("secret") ?? c.req.header("x-webhook-secret");
  if (!checkSecret(secret)) return c.json({ ok: false, error: "secret inválido" }, 401);

  const payload = await c.req.json().catch(() => ({}));
  // TODO: enrutar el mensaje al bot correspondiente / responder vía Evolution.
  console.log("[webhook:evolution]", JSON.stringify(payload).slice(0, 500));
  return c.json({ ok: true });
});

webhooks.post("/chatwoot", async (c) => {
  const secret = c.req.query("secret") ?? c.req.header("x-webhook-secret");
  if (!checkSecret(secret)) return c.json({ ok: false, error: "secret inválido" }, 401);

  const payload = await c.req.json().catch(() => ({}));
  // TODO: manejar eventos de Chatwoot (conversation_created, message_created, ...).
  console.log("[webhook:chatwoot]", JSON.stringify(payload).slice(0, 500));
  return c.json({ ok: true });
});
