---
id: US-008
---

# Tasks — US-008 · Gestión de identidad del agente

## Overview

Modelo y plantillas (T1–T2), servicio con versionado (T3), rutas (T4), editor UI (T5), integración (T6).

## Tasks

- [ ] **T1 — Migración: tabla `identity_documents`**
  - Archivos: `apps/backend/drizzle/000X_identity.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: unique `(bot_id, type, version)`; enum de tipos; índice por bot.
  - FAIL si: permite UPDATE del contenido (sin trigger/convención append-only documentada).
  - Properties: P1, P2
  - Requirements: 1.2, 2.1

- [ ] **T2 — Plantillas en `packages/shared`**
  - Archivos: `packages/shared/src/identity-templates.ts`
  - PASS si: 3 plantillas en español con secciones guía; importables desde backend y frontend.
  - FAIL si: plantillas vacías o genéricas sin estructura.
  - Properties: —
  - Requirements: 1.1

- [ ] **T3 — `identityService` (save, versions, restore, compile)**
  - Archivos: `apps/backend/src/services/identity.ts`
  - PASS si: save incrementa versión; restore crea versión nueva; compile omite vacíos y respeta orden; concurrencia resuelta por retry.
  - FAIL si: restore borra historial o compile usa versión no vigente.
  - Properties: P1, P2, P3
  - Requirements: 1.2, 2.1, 2.2, 3.1, 3.2, 3.3

- [ ] **T4 — Rutas `/api/bots/:id/identity*`**
  - Archivos: `apps/backend/src/routes/identity.ts`, `apps/backend/src/index.ts`
  - PASS si: admin escribe, member solo lee (403 en PUT); límite 20k → 422.
  - FAIL si: acceso cross-tenant posible.
  - Properties: P1
  - Requirements: 1.3, 1.4, 2.3

- [ ] **T5 — `IdentityEditor` con preview e historial**
  - Archivos: `apps/frontend/src/pages/bots/IdentityEditor.tsx`
  - PASS si: tabs por tipo, guardar con feedback de versión, historial con restaurar, contador de caracteres.
  - FAIL si: se pierde contenido al cambiar de tab sin guardar (sin confirmación).
  - Properties: P3
  - Requirements: 1.1, 1.2, 2.3, 2.2

- [ ] **T6 — Tests del ciclo de identidad**
  - Archivos: `apps/backend/test/identity.test.ts`
  - PASS si: save/restore/compile cubiertos + property tests de monotonía de versión.
  - FAIL si: tests no determinísticos.
  - Properties: P1, P2, P3
  - Requirements: 2.1, 2.2, 3.1, 3.3

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

- _(pendiente: estructura SOUL.md de OpenClaw/agentes como referencia de plantillas)_

## Notes

- El motor (US-011) importa `compileIdentity` directamente — mantener la firma estable.
- Editor markdown simple en MVP (textarea + preview); editor rico queda fuera.
