import {
  SubscriptionsApiError,
  SubscriptionsClient,
  type EntitlementsResult,
} from "@opensolvex/subscriptions-sdk";
import { env } from "../env.js";

/**
 * Cliente del servicio de suscripciones OpenSolvex (SUB-E08). El tenant
 * (organización de Clerk) es el externalOrgId del servicio.
 *
 * Degradación fail-open: si el servicio está caído, la plataforma sigue
 * operando con el último valor conocido (cache del SDK) o con acceso full —
 * nunca se bloquea a un cliente por una caída nuestra.
 *
 * null si la integración no está configurada (SUBSCRIPTIONS_API_URL/KEY).
 */
export const subscriptions =
  env.SUBSCRIPTIONS_API_URL && env.SUBSCRIPTIONS_API_KEY
    ? new SubscriptionsClient({
        baseUrl: env.SUBSCRIPTIONS_API_URL,
        apiKey: env.SUBSCRIPTIONS_API_KEY,
        productId: env.SUBSCRIPTIONS_PRODUCT_ID,
        degradation: "fail-open",
        cacheTtlMs: 30_000,
      })
    : null;

/**
 * Entitlements del tenant, o null si la integración está apagada o el
 * servicio respondió un error de negocio inesperado (se trata como "sin
 * información" y no se bloquea).
 */
export async function getTenantEntitlements(
  tenantId: string,
): Promise<EntitlementsResult | null> {
  if (!subscriptions) return null;
  try {
    return await subscriptions.getEntitlements(tenantId);
  } catch (e) {
    if (e instanceof SubscriptionsApiError) {
      console.warn(`[subscriptions] entitlements de ${tenantId} → ${e.status}`, e.body);
      return null;
    }
    throw e;
  }
}

// Sillas ya confirmadas en este proceso: evita repetir el POST idempotente
// en cada request. El servicio sigue siendo la fuente de verdad del límite.
const confirmedSeats = new Set<string>();

/**
 * Garantiza que el usuario ocupa una silla del tenant (asignación idempotente
 * en el servicio). Devuelve false SOLO si el límite contratado está agotado.
 */
export async function ensureSeat(tenantId: string, userId: string): Promise<boolean> {
  if (!subscriptions) return true;
  const key = `${tenantId}:${userId}`;
  if (confirmedSeats.has(key)) return true;
  try {
    await subscriptions.assignSeat(tenantId, userId);
    confirmedSeats.add(key);
    return true;
  } catch (e) {
    if (e instanceof SubscriptionsApiError && e.status === 409) return false;
    // Servicio caído o error de negocio (p. ej. tenant sin backfill): no bloquear.
    console.warn(`[subscriptions] assignSeat ${key} falló; se permite el acceso`, e);
    return true;
  }
}

/** El usuario dejó el tenant: libera su silla (no-op idempotente). */
export async function releaseSeat(tenantId: string, userId: string): Promise<void> {
  if (!subscriptions) return;
  confirmedSeats.delete(`${tenantId}:${userId}`);
  await subscriptions.releaseSeat(tenantId, userId).catch((e) => {
    console.warn(`[subscriptions] releaseSeat ${tenantId}:${userId} falló`, e);
  });
}

/**
 * Reporta consumo al servicio (idempotente por eventId). Fire-and-forget:
 * jamás interrumpe el flujo de mensajes del bot.
 */
export function reportUsage(tenantId: string, metric: string, eventId: string): void {
  if (!subscriptions) return;
  subscriptions
    .reportUsage({ eventId, externalOrgId: tenantId, metric, quantity: "1" })
    .catch((e) => {
      console.warn(`[subscriptions] usage ${metric}/${eventId} no reportado`, e);
    });
}
