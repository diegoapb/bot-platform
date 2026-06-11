---
id: US-005
---

# Tasks — US-005 · Registro y vinculación de número WhatsApp

## Overview

Primero el contrato con Evolution y el modelo de datos (T1–T2), luego endpoints y webhook (T3–T4), después UI (T5) y cierre con integración end-to-end (T6).

## Tasks

- [ ] **T1 — Migración: `connection_status`, `last_connected_at` y tabla `webhook_events`**
  - Archivos: `apps/backend/drizzle/000X_whatsapp_connection.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: `pnpm db:migrate` aplica; enum `connection_status` con 3 valores; `webhook_events` con índice por `(tenant_id, created_at)`.
  - FAIL si: tipos divergen del data model del diseño.
  - Properties: P2
  - Requirements: 3.1, 4.3

- [ ] **T2 — `EvolutionClient` completo en `integrations/evolution.ts`**
  - Archivos: `apps/backend/src/integrations/evolution.ts`, `apps/backend/src/env.ts`
  - PASS si: los 5 métodos del contrato funcionan contra Evolution de dev; errores HTTP se traducen a errores tipados.
  - FAIL si: claves/API key hardcodeadas o sin validación Zod en env.
  - Properties: P3
  - Requirements: 1.1, 1.3

- [ ] **T3 — Endpoints `POST/GET/DELETE /api/bots/:id/connection`**
  - Archivos: `apps/backend/src/routes/bots.ts`
  - PASS si: POST crea o reutiliza instancia y devuelve QR; GET devuelve estado+QR; DELETE hace logout; member sin asignación → 403.
  - FAIL si: un tenant accede a la conexión de un bot ajeno.
  - Properties: P3, P4
  - Requirements: 1.1, 1.2, 1.4, 2.1, 3.3

- [ ] **T4 — Webhook `POST /api/webhooks/evolution/:instance`**
  - Archivos: `apps/backend/src/routes/webhooks.ts`
  - PASS si: token inválido → 401 sin escritura; `connection.update` actualiza estado; instancia desconocida → 200 + log.
  - FAIL si: un evento sin token muta la DB.
  - Properties: P1, P2
  - Requirements: 4.1, 4.2, 4.3, 4.4, 3.1

- [ ] **T5 — Vista `ConnectWhatsApp` con QR y polling**
  - Archivos: `apps/frontend/src/pages/bots/ConnectWhatsApp.tsx`, `apps/frontend/src/lib/api.ts`
  - PASS si: QR visible y auto-refrescado; transición a "Conectado" sin reload; timeout 5 min con CTA de reintento.
  - FAIL si: polling continúa tras `connected` o tras timeout.
  - Properties: P4
  - Requirements: 2.1, 2.2, 2.3, 2.4, 3.2

- [ ] **T6 — Tests de integración del ciclo conexión**
  - Archivos: `apps/backend/test/connection.test.ts`
  - PASS si: secuencia crear → webhook open → GET refleja `connected`; reconexión tras `close` funciona.
  - FAIL si: tests dependen de Evolution real.
  - Properties: P1, P2, P3, P4
  - Requirements: 1.1, 2.3, 3.1, 3.2, 4.1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2"] },
    { "id": 2, "tasks": ["T3", "T4"], "depends_on": [1] },
    { "id": 3, "tasks": ["T5"], "depends_on": [2] },
    { "id": 4, "tasks": ["T6"], "depends_on": [3] }
  ]
}
```

## Commits

_(SHAs al ejecutar)_

## Research consultada

- _(pendiente: doc de eventos webhook de Evolution v2)_

## Notes

- Requiere `PUBLIC_WEBHOOK_BASE_URL` accesible desde Evolution (túnel Cloudflare en dev).
- Riesgo: cambios de payload entre versiones de Evolution — fijar versión en Dokploy.
