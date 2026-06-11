---
id: US-006
---

# Tasks — US-006 · Provisión de cuenta e inbox Chatwoot por tenant

## Overview

Contrato del cliente Chatwoot primero (T1–T2), servicio idempotente después (T3), rutas y UI al final (T4–T5), integración como cierre (T6).

## Tasks

- [ ] **T1 — Migración: `chatwoot_account_id` en tenants + `chatwoot_inbox_identifier` en bots**
  - Archivos: `apps/backend/drizzle/000X_chatwoot_provision.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: migración aplica; columnas nullable; sin pérdida de datos existentes.
  - FAIL si: `chatwoot_inbox_identifier` queda expuesto en algún select de API.
  - Properties: P3
  - Requirements: 1.1, 2.1

- [ ] **T2 — `ChatwootClient` (Platform API) en `integrations/chatwoot.ts`**
  - Archivos: `apps/backend/src/integrations/chatwoot.ts`, `apps/backend/src/env.ts`
  - PASS si: 5 métodos del contrato operativos contra Chatwoot dev; errores tipados.
  - FAIL si: token de plataforma logueado o hardcodeado.
  - Properties: P3
  - Requirements: 1.1, 2.1, 3.1

- [ ] **T3 — Servicio `chatwootProvisioning` idempotente**
  - Archivos: `apps/backend/src/services/chatwoot-provisioning.ts`
  - PASS si: doble ejecución → 1 cuenta, 1 inbox; fallo inyectado en paso 2 → reanuda sin duplicar paso 1.
  - FAIL si: estado parcial sin persistir tras paso exitoso.
  - Properties: P1, P2
  - Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 4.1, 4.2

- [ ] **T4 — Rutas de provisión y agentes**
  - Archivos: `apps/backend/src/routes/bots.ts`
  - PASS si: provision (admin) → 200 con ids; alta agente idempotente → 200; member → 403.
  - FAIL si: tenant ajeno accede a la provisión de otro.
  - Properties: P1, P3
  - Requirements: 1.1, 3.1, 3.3, 4.1

- [ ] **T5 — UI `ChatwootSettings`**
  - Archivos: `apps/frontend/src/pages/bots/ChatwootSettings.tsx`
  - PASS si: muestra estado de provisión, permite provisionar, listar/agregar agentes y abre `dashboardUrl`.
  - FAIL si: muestra identificadores secretos del inbox.
  - Properties: P3
  - Requirements: 2.1, 3.2

- [ ] **T6 — Tests de integración de provisión**
  - Archivos: `apps/backend/test/chatwoot-provision.test.ts`
  - PASS si: flujo completo + re-ejecución + fallo intermedio cubiertos con Chatwoot mockeado.
  - FAIL si: tests requieren Chatwoot real.
  - Properties: P1, P2, P3
  - Requirements: 1.1, 2.1, 4.1, 4.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2"] },
    { "id": 2, "tasks": ["T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4"], "depends_on": [2] },
    { "id": 4, "tasks": ["T5", "T6"], "depends_on": [3] }
  ]
}
```

## Commits

_(SHAs al ejecutar)_

## Research consultada

- _(pendiente: Platform API de Chatwoot — creación de cuentas y usuarios)_

## Notes

- Requiere Chatwoot self-hosted con Platform App token (no disponible en Chatwoot cloud estándar).
- Decisión asumida: 1 tenant = 1 cuenta Chatwoot (no sub-inboxes en cuenta compartida) — validar costo operativo.
