# Integración con el servicio de suscripciones OpenSolvex (SUB-E08)

bot-plataform es el primer consumidor del servicio de suscripciones. Este doc describe el
patrón para que los próximos productos lo repliquen.

## Modelo

- El **tenant** (organización de Clerk) es el `externalOrgId` del servicio; no hay mapeo extra.
- El producto está registrado en el catálogo como `bot-plataform`, con la métrica de consumo
  `messages` (mensajes entrantes de WhatsApp) y planes con sillas (`starter`, `pro`).
- Una **silla** = un usuario del tenant que usa el panel. Se ocupa de forma lazy e idempotente
  la primera vez que el usuario opera sobre el tenant.

## Piezas (todas detrás de env opcional: sin config, integración apagada)

| Pieza | Archivo |
|---|---|
| Cliente SDK singleton (`fail-open`, cache 30s) | `apps/backend/src/lib/subscriptions.ts` |
| Enforcement por request (bloqueo + sillas) | `apps/backend/src/middleware/subscription.ts` |
| Punto de enganche (cubre TODA ruta de tenant) | `requireTenant` en `apps/backend/src/middleware/auth.ts` |
| Estado para el frontend | `GET /api/me` → campo `subscription` |
| Runtime del bot (no responde si `blocked`) + consumo | `apps/backend/src/services/message-sync.ts` |
| UI de bloqueo/banner | `TenantGate` en `apps/frontend/src/App.tsx` |

## Semántica de acceso

- `full` (active/trialing) → todo opera.
- `restricted` (past_due) → el panel y el bot siguen operando; banner con `paymentUrl`.
- `blocked` (suspended/paused/cancelled/sin plan) → rutas de tenant devuelven **402**
  `subscription_blocked`; el frontend muestra la pantalla de pago; el bot deja de responder
  (los mensajes entrantes se siguen sincronizando a Chatwoot para no perder conversaciones).
- Límite de sillas agotado → **403** `seat_limit_reached` solo para usuarios sin silla; los
  que ya la ocupan siguen entrando.
- Al pagar (portal del servicio), el acceso se restaura solo: el cache del SDK expira en ≤30s.

## Degradación (servicio caído)

`fail-open`: se sirve el último valor conocido del cache y, sin cache, acceso `full` con
`degraded: true`. La plataforma jamás se bloquea por una caída del servicio de suscripciones.

## Config (backend `.env`)

```
SUBSCRIPTIONS_API_URL=http://localhost:3001/v1
SUBSCRIPTIONS_API_KEY=osx_...   # API key M2M (scopes: entitlements:read, seats:write, usage:write)
SUBSCRIPTIONS_PRODUCT_ID=bot-plataform
```

La key se crea en el servicio: `POST /v1/api-keys` (admin). El backfill de tenants existentes
se hace desde el backoffice del servicio ("Sincronizar desde Clerk") — idempotente.

## Consumo

Cada mensaje entrante reporta `metric=messages, quantity=1` con
`eventId = evo:<botId>:<messageId>` — el mismo id del dedupe local, así el reporte es
idempotente en ambos lados. El reporte es fire-and-forget: nunca interrumpe el flujo del bot.
La métrica debe existir en el servicio (`POST /v1/admin/metrics`) antes de reportar.
