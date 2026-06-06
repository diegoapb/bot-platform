import { createClerkClient } from "@clerk/backend";
import type { MiddlewareHandler } from "hono";
import { env } from "../env.js";

const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
});

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}

/**
 * Verifica el token de Clerk del request y expone `c.get("userId")`.
 * El frontend manda `Authorization: Bearer <token>` (token de sesión Clerk).
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const requestState = await clerk.authenticateRequest(c.req.raw, {
    authorizedParties: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
  });

  const auth = requestState.toAuth();
  if (!auth || !auth.userId) {
    return c.json({ ok: false, error: "No autenticado" }, 401);
  }

  c.set("userId", auth.userId);
  await next();
};
