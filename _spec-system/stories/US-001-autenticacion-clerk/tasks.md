---
id: US-001
---

# Tasks — US-001 · Autenticación con Clerk

> Historia en producción. Tareas listadas en orden cronológico.

## Backend

- [x] **T1 — Esquema de variables de entorno con Clerk**
  - Archivos: `apps/backend/src/env.ts`
  - Commits: `cf6beee`

- [x] **T2 — Middleware `requireAuth` con `@clerk/backend`**
  - Archivos: `apps/backend/src/middleware/auth.ts`
  - Commits: `cf6beee`, `cc9d0a9`

- [x] **T3 — CORS configurable por env**
  - Archivos: `apps/backend/src/index.ts`, `apps/backend/src/env.ts`
  - Commits: `cf6beee`

## Frontend

- [x] **T4 — `ClerkProvider` y bootstrap**
  - Archivos: `apps/frontend/src/main.tsx`
  - Commits: `cf6beee`

- [x] **T5 — Gating de rutas con `<SignedIn>`/`<SignedOut>` y redirects**
  - Archivos: `apps/frontend/src/App.tsx`
  - Commits: `cf6beee`, `cc9d0a9`

- [x] **T6 — Cliente API con `Authorization: Bearer <getToken()>`**
  - Archivos: `apps/frontend/src/lib/api.ts`
  - Commits: `cf6beee`

## Informes generados por agentes

_(ninguno)_

## Notes

- Las claves `pk_test_…` se pueden compartir entre apps, pero `sk_test_…` solo en backend.
- En dev se usa el proxy `/api` de Vite, por eso `CORS_ORIGIN=http://localhost:5173` basta en local.
