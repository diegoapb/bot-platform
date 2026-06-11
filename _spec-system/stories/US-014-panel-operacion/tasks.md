---
id: US-014
---

# Tasks — US-014 · Panel de operación y despliegue MVP

## Overview

Endpoints de lectura (T1–T2), health extendido (T3), vistas UI (T4), métricas UI (T5), despliegue Dokploy + smoke (T6–T7).

## Tasks

- [ ] **T1 — Endpoints conversaciones + mensajes paginados**
  - Archivos: `apps/backend/src/routes/conversations.ts`
  - PASS si: cursor estable; filtros bot/modo; member ve solo bots asignados.
  - FAIL si: duplicados al paginar con actividad concurrente.
  - Properties: P1, P3
  - Requirements: 1.1, 1.2

- [ ] **T2 — Endpoints métricas + generaciones (tenant y admin)**
  - Archivos: `apps/backend/src/routes/metrics.ts`, `apps/backend/src/routes/generations.ts`, `apps/backend/src/routes/admin.ts`
  - PASS si: agregaciones correctas con seed conocido; super admin accede vía /admin; tenant aislado.
  - FAIL si: cifras incluyen datos de otro tenant.
  - Properties: P1, P2
  - Requirements: 2.1, 2.2, 3.1, 3.2, 3.3

- [ ] **T3 — Healthcheck extendido con cache**
  - Archivos: `apps/backend/src/routes/health.ts`
  - PASS si: ok ⇔ 3 checks; timeout 2s; cache 30s.
  - FAIL si: health tarda >3s con dependencia caída.
  - Properties: P4
  - Requirements: 4.3, 4.4

- [ ] **T4 — UI: lista de conversaciones + vista de conversación**
  - Archivos: `apps/frontend/src/pages/conversations/ConversationsList.tsx`, `ConversationView.tsx`
  - PASS si: refetch 10s; historial con origen de cada mensaje; acciones de modo (US-012) integradas.
  - FAIL si: cambio de modo no se refleja tras la acción.
  - Properties: P3
  - Requirements: 1.1, 1.2, 1.3, 1.4

- [ ] **T5 — UI: métricas + log de generaciones**
  - Archivos: `apps/frontend/src/pages/metrics/MetricsDashboard.tsx`, `apps/frontend/src/pages/bots/GenerationsLog.tsx`
  - PASS si: rango 7/30d, gráficos con recharts, traza expandible con prompt/respuesta.
  - FAIL si: trazas muestran datos de otros bots del mismo tenant sin permiso.
  - Properties: P1, P2
  - Requirements: 2.1, 3.1, 3.2

- [ ] **T6 — Despliegue en Dokploy (compose + dominios + env prod)**
  - Archivos: `infra/docker-compose.prod.yml`, `infra/README.md`, `.env.example`
  - PASS si: frontend y backend públicos con TLS; webhooks de Evolution/Chatwoot apuntando a prod; pgvector disponible.
  - FAIL si: secretos commiteados o webhook URLs hardcodeadas.
  - Properties: P4
  - Requirements: 4.1, 4.2

- [ ] **T7 — Smoke test post-deploy**
  - Archivos: `scripts/smoke-prod.mjs`
  - PASS si: health ok, login real, webhook de prueba procesado end-to-end.
  - FAIL si: script no ejecutable en CI/manual.
  - Properties: P4
  - Requirements: 4.2, 4.3

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2", "T3"] },
    { "id": 2, "tasks": ["T4", "T5"], "depends_on": [1] },
    { "id": 3, "tasks": ["T6"], "depends_on": [2] },
    { "id": 4, "tasks": ["T7"], "depends_on": [3] }
  ]
}
```

## Commits

_(SHAs al ejecutar)_

## Research consultada

- _(n/a — agregación SQL directa y despliegue Dokploy conocido)_

## Notes

- Última historia del ciclo: requiere US-011/US-012 en funcionamiento para tener datos reales.
- Usar la skill `dokploy-api` para T6 (proyectos, compose, dominios, reutilización de Postgres).
