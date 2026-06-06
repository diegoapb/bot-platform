import type { MiddlewareHandler } from "hono";
import { env } from "../env.js";
import { clerk } from "../lib/clerk.js";

export const ADMIN_ROLE = "org:admin";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    // Tenant activo (Clerk org id). null si el usuario no tiene org activa.
    tenantId: string | null;
    // Rol en el tenant activo ("org:admin" | "org:member" | ...). null sin org.
    tenantRole: string | null;
  }
}

/**
 * Verifica el token de Clerk y expone identidad + contexto de tenant.
 * El frontend manda `Authorization: Bearer <token de sesión Clerk>`. Cuando hay
 * una organización activa, el token incluye `org_id` y `org_role` (claims nativos).
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
  c.set("tenantId", auth.orgId ?? null);
  c.set("tenantRole", auth.orgRole ?? null);
  await next();
};

/** Exige que haya un tenant (organización) activo. Encadenar tras requireAuth. */
export const requireTenant: MiddlewareHandler = async (c, next) => {
  if (!c.get("tenantId")) {
    return c.json(
      { ok: false, error: "Selecciona o crea un tenant (organización) primero" },
      403,
    );
  }
  await next();
};

/** Exige rol de administrador del tenant. Encadenar tras requireTenant. */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  if (c.get("tenantRole") !== ADMIN_ROLE) {
    return c.json({ ok: false, error: "Requiere rol de administrador del tenant" }, 403);
  }
  await next();
};
