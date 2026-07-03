import type { Context } from "hono";
import type { EntitlementsResult } from "@opensolvex/subscriptions-sdk";
import { ensureSeat, getTenantEntitlements } from "../lib/subscriptions.js";

declare module "hono" {
  interface ContextVariableMap {
    // Entitlements del tenant activo. null = integración apagada / sin datos.
    entitlements: EntitlementsResult | null;
  }
}

type Enforcement =
  | { allowed: true }
  | { allowed: false; status: 402 | 403; body: Record<string, unknown> };

/**
 * Enforcement de suscripción (SUB-E08), invocado por requireTenant para que
 * TODA ruta de tenant quede cubierta desde un solo punto:
 *  - `blocked` (suspended/cancelled/sin plan) → 402: el panel no opera.
 *  - `restricted` (past_due) → pasa, con banner en el frontend vía /api/me.
 *  - Silla del usuario: asignación idempotente; sin cupo → 403.
 * Con la integración apagada o el servicio degradado fail-open, siempre pasa.
 */
export async function enforceSubscription(c: Context): Promise<Enforcement> {
  const tenantId = c.get("tenantId");
  if (!tenantId) return { allowed: true };

  const ent = await getTenantEntitlements(tenantId);
  c.set("entitlements", ent);
  if (!ent) return { allowed: true };

  if (ent.access === "blocked") {
    return {
      allowed: false,
      status: 402,
      body: {
        ok: false,
        error: "La suscripción de tu organización no está activa",
        code: "subscription_blocked",
        reason: ent.reason,
        paymentUrl: ent.paymentUrl,
      },
    };
  }

  if (!(await ensureSeat(tenantId, c.get("userId")))) {
    return {
      allowed: false,
      status: 403,
      body: {
        ok: false,
        error: "El límite de sillas contratadas está agotado",
        code: "seat_limit_reached",
        seats: ent.seats,
        paymentUrl: ent.paymentUrl,
      },
    };
  }

  return { allowed: true };
}
