import { Hono } from "hono";
import type { Me } from "@bot/shared";
import { requireAuth, resolveSuperAdmin, ADMIN_ROLE } from "../middleware/auth.js";
import { getTenantEntitlements } from "../lib/subscriptions.js";

export const meRoutes = new Hono();

meRoutes.use("*", requireAuth);

/**
 * Identidad del usuario + tenant activo, rol, rol de plataforma y estado de
 * la suscripción del tenant (SUB-E08). Esta ruta NO pasa por requireTenant a
 * propósito: es la que le permite al frontend saber que el tenant está
 * bloqueado y mostrar la pantalla de pago.
 */
meRoutes.get("/", async (c) => {
  const role = c.get("tenantRole");
  const tenantId = c.get("tenantId");
  const ent = tenantId ? await getTenantEntitlements(tenantId) : null;
  const me: Me = {
    userId: c.get("userId"),
    tenantId,
    role: (role as Me["role"]) ?? null,
    isAdmin: role === ADMIN_ROLE,
    isSuperAdmin: await resolveSuperAdmin(c.get("userId")),
    subscription: ent && {
      access: ent.access,
      reason: ent.reason,
      plan: ent.plan?.name ?? null,
      seats: ent.seats,
      paymentUrl: ent.paymentUrl,
      degraded: ent.degraded,
    },
  };
  return c.json({ ok: true, data: me });
});
