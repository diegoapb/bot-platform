---
id: US-003
title: Super admin de plataforma
epic: E01
cycle: C00
status: En producción
priority: P1
estimate: M
owner: @diego
---

# US-003 · Super admin de plataforma

**Como** equipo operador de woofly, **quiero** un rol de super admin por encima de los tenants, **para** poder ver el estado global de la plataforma y bloquear tenants problemáticos.

Es un rol **por encima de Clerk Organizations**: no depende de pertenecer a una org. Se resuelve en el backend por allowlist (env) o por `publicMetadata.role = "superadmin"` en Clerk.

## Capacidades entregadas (en lugar de `requirements.md`)

1. **Resolución del rol**: un usuario es super admin si su `userId` está en `SUPERADMIN_USER_IDS` (env) **o** si su user en Clerk tiene `public/privateMetadata.role === "superadmin"`.
2. **`GET /api/me`** devuelve `isSuperAdmin: boolean`.
3. **Panel `/admin`** en el frontend: visible solo si `me.isSuperAdmin`; permite ver y bloquear/desbloquear tenants.
4. **Bypass de bloqueo**: un tenant bloqueado responde 403 al usuario normal, pero el super admin sí puede operarlo (útil para diagnóstico).
5. **Redirect inteligente**: si un super admin entra sin tener org activa, no se le pide crear una — va directo a `/admin`.

## Arquitectura entregada (en lugar de `design.md`)

```
                  isSuperAdmin?
SUPERADMIN_USER_IDS (env)  ──┐
                              ├──▶ resolveSuperAdmin(userId) → boolean
Clerk publicMetadata.role  ──┘
```

**Backend** — `apps/backend/src/`
- `env.ts` — `SUPERADMIN_USER_IDS` como CSV.
- `middleware/auth.ts` — `resolveSuperAdmin(userId)` y `requireSuperAdmin` middleware.
- `routes/admin.ts` — `GET /api/admin/tenants`, `POST /api/admin/tenants/:id/block`, etc., protegidos con `requireSuperAdmin`.
- `routes/me.ts` — incluye `isSuperAdmin` en la respuesta.

**Frontend** — `apps/frontend/src/`
- `App.tsx` — `SuperAdminGate`: si la ruta es `/admin` y `me.isSuperAdmin === false`, redirige a `/`.
- `pages/AdminPage.tsx` — UI de gestión de tenants.
- `components/Layout.tsx` — link "Plataforma" condicional en el nav.

**Bootstrap**: el primer super admin se asigna por env (`SUPERADMIN_USER_IDS=user_…`); a partir de ahí se administran por metadata en Clerk dashboard.

## Documentos

- [Requerimientos](./requirements.md) — _stub: ver índice._
- [Diseño](./design.md) — _stub: ver índice._
- [Tareas](./tasks.md) — commits y archivos modificados.
