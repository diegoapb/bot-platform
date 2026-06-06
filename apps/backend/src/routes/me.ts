import { Hono } from "hono";
import type { Me } from "@bot/shared";
import { requireAuth, ADMIN_ROLE } from "../middleware/auth.js";

export const meRoutes = new Hono();

meRoutes.use("*", requireAuth);

/** Identidad del usuario + tenant activo y rol. El frontend lo usa para la UI. */
meRoutes.get("/", (c) => {
  const role = c.get("tenantRole");
  const me: Me = {
    userId: c.get("userId"),
    tenantId: c.get("tenantId"),
    role: (role as Me["role"]) ?? null,
    isAdmin: role === ADMIN_ROLE,
  };
  return c.json({ ok: true, data: me });
});
