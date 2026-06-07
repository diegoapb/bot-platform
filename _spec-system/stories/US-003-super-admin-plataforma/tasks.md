---
id: US-003
---

# Tasks — US-003 · Super admin de plataforma

> Historia en producción.

## Backend

- [x] **T1 — Variable `SUPERADMIN_USER_IDS` en env (CSV)**
  - Archivos: `apps/backend/src/env.ts`, `apps/backend/.env.example`
  - Commits: `5df0202`

- [x] **T2 — `resolveSuperAdmin(userId)` y `requireSuperAdmin`**
  - Archivos: `apps/backend/src/middleware/auth.ts`
  - Commits: `5df0202`

- [x] **T3 — `tenants.blocked` + bypass para super admin en `requireTenant`**
  - Archivos: `apps/backend/src/db/schema.ts`, `apps/backend/src/middleware/auth.ts`, `apps/backend/drizzle/*`
  - Commits: `5df0202`

- [x] **T4 — Endpoints de administración (`/api/admin/*`)**
  - Archivos: `apps/backend/src/routes/admin.ts`
  - Commits: `5df0202`

- [x] **T5 — `GET /api/me` incluye `isSuperAdmin`**
  - Archivos: `apps/backend/src/routes/me.ts`
  - Commits: `5df0202`

## Frontend

- [x] **T6 — `SuperAdminGate` y redirect en App.tsx**
  - Archivos: `apps/frontend/src/App.tsx`
  - Commits: `5df0202`

- [x] **T7 — Página `/admin` (listar y bloquear/desbloquear tenants)**
  - Archivos: `apps/frontend/src/pages/AdminPage.tsx`
  - Commits: `5df0202`

- [x] **T8 — Link condicional "Plataforma" en el nav**
  - Archivos: `apps/frontend/src/components/Layout.tsx`
  - Commits: `5df0202`

## Informes generados por agentes

_(ninguno)_

## Notes

- Asignación inicial vía env (`SUPERADMIN_USER_IDS=user_3EkZ1zJw7VL61bHyZ2pswJoXYge`).
- A futuro, gestión de super admins desde el propio `/admin` evitando tocar `.env`.
