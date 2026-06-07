---
id: US-002
title: Multitenancy con Clerk Organizations
epic: E01
cycle: C00
status: En producción
priority: P0
estimate: L
owner: @diego
---

# US-002 · Multitenancy con Clerk Organizations

**Como** admin de una empresa, **quiero** que mis datos estén aislados de otros clientes de la plataforma, **para** que solo mi equipo vea y opere mis bots.

Cada **tenant = una Clerk Organization**. El `org_id` que viaja en el token de Clerk se persiste en `tenants.id` y se inyecta en cada query del backend. Sin organización activa, las APIs de negocio responden 403 con un mensaje accionable.

## Capacidades entregadas (en lugar de `requirements.md`)

1. **Onboarding de tenant**: tras login, si el usuario no tiene org activa, el frontend lo manda a un formulario para crear su organización. Al crearla queda como `org:admin`.
2. **Contexto de tenant en backend**: el middleware `requireTenant` exige `org_id` en el token y lo expone como `tenantId`. Sin org → 403 *"Selecciona o crea un tenant primero"*.
3. **Persistencia de tenants**: cada org de Clerk se materializa en la tabla `tenants` con `id` = `org_id`, plus metadata local (`blocked`, fechas).
4. **Rol del usuario en el tenant**: el claim `org_role` del token se expone como `tenantRole` (`org:admin` | `org:member`).
5. **Bloqueo de tenant**: si `tenants.blocked = true`, `requireTenant` responde 403 *"Este tenant está bloqueado por la plataforma"* (el super admin sí pasa).
6. **Aislamiento por defecto**: las queries de bots/equipo filtran por `tenantId`; un usuario no puede ver datos de otra org aunque conozca el ID.

## Arquitectura entregada (en lugar de `design.md`)

```
Clerk token (claims)
  ├─ sub       → userId
  ├─ org_id    → tenantId
  └─ org_role  → tenantRole
        │
        ▼
[ Backend Hono ]
  requireAuth     → set userId
  requireTenant   → exige tenantId, valida tenants.blocked
  requireAdmin    → exige tenantRole === "org:admin"
```

**Backend** — `apps/backend/src/`
- `db/schema.ts` — tabla `tenants` (`id` text PK = Clerk `org_…`, `blocked` bool, timestamps).
- `middleware/auth.ts` — `requireAuth` (set `userId/tenantId/tenantRole`), `requireTenant` (valida `tenants.blocked`), `requireAdmin` (exige `org:admin`).
- `routes/me.ts` — `GET /api/me` devuelve user + tenant activo + rol.
- `routes/bots.ts`, `routes/team.ts` — todas las queries usan `c.get("tenantId")`.

**Frontend** — `apps/frontend/src/`
- `App.tsx` — gate `RequireOrg`: si `me.organizationId` es null y no eres super admin → formulario "Crea tu organización"; si super admin sin org → `/admin`.
- `components/Layout.tsx` — `<OrganizationSwitcher />` de Clerk para cambiar de org activa.
- `pages/TeamPage.tsx` — invitar miembros (consume APIs de Clerk Organizations).

**Decisión clave (ADR-001)**: usar Clerk Organizations en vez de roles propios. Trade-off: dependencia fuerte de Clerk; beneficio: invitaciones y switching gratis.

## Documentos

- [Requerimientos](./requirements.md) — _stub: ver "Capacidades entregadas" en este índice._
- [Diseño](./design.md) — _stub: ver "Arquitectura entregada"._
- [Tareas](./tasks.md) — commits y archivos modificados.
