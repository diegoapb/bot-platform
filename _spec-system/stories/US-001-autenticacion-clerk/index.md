---
id: US-001
title: Autenticación con Clerk
epic: E01
cycle: C00
status: En producción
priority: P0
estimate: M
owner: @diego
---

# US-001 · Autenticación con Clerk

**Como** usuario de la plataforma, **quiero** registrarme e iniciar sesión con email/password (o proveedores sociales), **para** acceder al dashboard de bots de mi organización.

Base de identidad del sistema. Toda llamada a `/api/*` exige un token de Clerk válido; sin sesión no se renderizan rutas protegidas en el frontend.

## Capacidades entregadas (en lugar de `requirements.md`)

1. **Registro/login**: cualquier visitante puede crear cuenta o iniciar sesión usando los componentes de Clerk en el frontend.
2. **Sesión persistente**: el frontend mantiene la sesión vía cookies de Clerk y adjunta `Authorization: Bearer <token>` a cada llamada API.
3. **Protección de rutas**: el frontend redirige a login si no hay sesión; el backend responde **401** si el token falta o es inválido.
4. **Identidad expuesta**: tras el middleware `requireAuth`, las rutas reciben `userId` (Clerk `user_…`) en el contexto Hono.
5. **Authorized parties**: el backend valida que el token venga de un `Origin` permitido (`CORS_ORIGIN` alimenta `authorizedParties`).

## Arquitectura entregada (en lugar de `design.md`)

```
[ Browser ]──cookie──▶[ Clerk ]
     │
     │ Bearer <token>
     ▼
[ Frontend Vite/React + @clerk/clerk-react ]
     │ proxy /api
     ▼
[ Backend Hono + @clerk/backend ]──verify──▶[ Clerk ]
```

**Frontend** — `apps/frontend/`
- `src/main.tsx` — bootstrap con `ClerkProvider` (lee `VITE_CLERK_PUBLISHABLE_KEY`).
- `src/App.tsx` — gating de rutas: usuarios sin sesión van a `<SignIn />`/`<SignUp />`; con sesión, layout autenticado.
- `src/lib/api.ts` — cliente fetch que añade `Authorization: Bearer <getToken()>` a cada request.

**Backend** — `apps/backend/`
- `src/middleware/auth.ts` — `requireAuth` llama `clerk.authenticateRequest()`, expone `userId` en el contexto, responde 401 si no autenticado.
- `src/index.ts` — middleware CORS con `CORS_ORIGIN.split(",")`.
- `src/env.ts` — schema Zod para `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CORS_ORIGIN`.

**Config**
- `apps/frontend/.env` → `VITE_CLERK_PUBLISHABLE_KEY`.
- `apps/backend/.env` → `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CORS_ORIGIN`.

## Documentos

- [Requerimientos](./requirements.md) — _stub: la historia ya está en producción._
- [Diseño](./design.md) — _stub: ver "Arquitectura entregada" arriba._
- [Tareas](./tasks.md) — commits y archivos modificados.
