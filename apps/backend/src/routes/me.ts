import { Hono } from "hono";
import type { Me } from "@bot/shared";
import { requireAuth, resolveSuperAdmin, ADMIN_ROLE } from "../middleware/auth.js";

export const meRoutes = new Hono();

meRoutes.use("*", requireAuth);

/** Identidad del usuario + tenant activo, rol y rol de plataforma. */
meRoutes.get("/", async (c) => {
  const role = c.get("tenantRole");
  const me: Me = {
    userId: c.get("userId"),
    tenantId: c.get("tenantId"),
    role: (role as Me["role"]) ?? null,
    isAdmin: role === ADMIN_ROLE,
    isSuperAdmin: await resolveSuperAdmin(c.get("userId")),
  };
  return c.json({ ok: true, data: me });
});
