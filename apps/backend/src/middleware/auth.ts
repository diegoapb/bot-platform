import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { env } from "../env.js";
import { clerk } from "../lib/clerk.js";
import { db } from "../db/client.js";
import { tenants } from "../db/schema.js";

export const ADMIN_ROLE = "org:admin";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    // Tenant activo (Clerk org id). null si el usuario no tiene org activa.
    tenantId: string | null;
    // Rol en el tenant activo ("org:admin" | "org:member" | ...). null sin org.
    tenantRole: string | null;
    // Rol de plataforma (por encima de los tenants).
    isSuperAdmin: boolean;
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

/**
 * Determina si un usuario es super admin de la plataforma:
 *  1) está en la allowlist SUPERADMIN_USER_IDS (bootstrap), o
 *  2) su user en Clerk tiene public/privateMetadata.role === "superadmin".
 */
export async function resolveSuperAdmin(userId: string): Promise<boolean> {
  if (env.SUPERADMIN_USER_IDS.includes(userId)) return true;
  try {
    const u = await clerk.users.getUser(userId);
    const role =
      (u.publicMetadata as { role?: string } | null)?.role ??
      (u.privateMetadata as { role?: string } | null)?.role;
    return role === "superadmin";
  } catch {
    return false;
  }
}

/** Exige rol de super admin de plataforma. Encadenar tras requireAuth. */
export const requireSuperAdmin: MiddlewareHandler = async (c, next) => {
  const ok = await resolveSuperAdmin(c.get("userId"));
  if (!ok) return c.json({ ok: false, error: "Requiere super admin de plataforma" }, 403);
  c.set("isSuperAdmin", true);
  await next();
};

/**
 * Exige que haya un tenant activo y que NO esté bloqueado. Encadenar tras
 * requireAuth. El super admin no se ve afectado por el bloqueo.
 */
export const requireTenant: MiddlewareHandler = async (c, next) => {
  const tenantId = c.get("tenantId");
  if (!tenantId) {
    return c.json(
      { ok: false, error: "Selecciona o crea un tenant (organización) primero" },
      403,
    );
  }

  const [t] = await db
    .select({ blocked: tenants.blocked })
    .from(tenants)
    .where(eq(tenants.id, tenantId));
  if (t?.blocked) {
    return c.json({ ok: false, error: "Este tenant está bloqueado por la plataforma" }, 403);
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
