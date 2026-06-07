---
id: US-002
---

# Tasks — US-002 · Multitenancy con Clerk Organizations

> Historia en producción.

## Backend

- [x] **T1 — Tabla `tenants` en Drizzle (PK = Clerk `org_id`)**
  - Archivos: `apps/backend/src/db/schema.ts`, `apps/backend/drizzle/*` (migración inicial)
  - Commits: `cc9d0a9`

- [x] **T2 — `requireAuth` expone `tenantId` y `tenantRole` desde claims**
  - Archivos: `apps/backend/src/middleware/auth.ts`
  - Commits: `cc9d0a9`

- [x] **T3 — `requireTenant` exige org activa y valida `blocked`**
  - Archivos: `apps/backend/src/middleware/auth.ts`
  - Commits: `cc9d0a9`, `5df0202`

- [x] **T4 — `requireAdmin` exige rol `org:admin`**
  - Archivos: `apps/backend/src/middleware/auth.ts`
  - Commits: `cc9d0a9`

- [x] **T5 — `GET /api/me` con userId + tenant + rol + flags**
  - Archivos: `apps/backend/src/routes/me.ts`
  - Commits: `cc9d0a9`, `5df0202`

- [x] **T6 — Routes de bots y team filtran por `tenantId`**
  - Archivos: `apps/backend/src/routes/bots.ts`, `apps/backend/src/routes/team.ts`
  - Commits: `cc9d0a9`

## Frontend

- [x] **T7 — Gate `RequireOrg`: crear org si no hay activa**
  - Archivos: `apps/frontend/src/App.tsx`
  - Commits: `cc9d0a9`

- [x] **T8 — `OrganizationSwitcher` en el layout**
  - Archivos: `apps/frontend/src/components/Layout.tsx`
  - Commits: `cc9d0a9`

- [x] **T9 — Página de equipo (invitar miembros via Clerk)**
  - Archivos: `apps/frontend/src/pages/TeamPage.tsx`
  - Commits: `cc9d0a9`

## Research consultada

_(ninguna)_

## Notes

- Requisito en Clerk dashboard: **Organizations → Enable**. Sin esto no funciona el flujo.
- El `tenantId` que persistimos es **literalmente** el `org_…` de Clerk → no hace falta tabla de mapping.
