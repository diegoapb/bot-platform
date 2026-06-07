---
id: C00
name: Bootstrap
start: 2026-05-10
end: 2026-06-06
goal: Dejar la base de identidad, multitenancy y onboarding lista para empezar a construir producto encima.
---

## Objetivo

Ciclo **retroactivo**: agrupa todo lo construido antes de adoptar el `_spec-system`. Sirve como referencia histórica y para que el roadmap no muestre las historias fundacionales en backlog.

## Cierre

- Auth + multitenancy + super admin + onboarding local entregados.
- Stack confirmado: pnpm workspaces, Hono, Vite + React, Clerk Organizations, Postgres en Dokploy.
- Decisión clave: tenant = Clerk org (ver `ADR-001` en `architecture.md`).

## Retrospectiva

- **Qué funcionó**: Clerk Organizations ahorró meses de trabajo en invitaciones y switching de org.
- **Qué no**: el onboarding inicial obligaba a tener túnel SSH abierto mentalmente — se documentó tras el primer dev nuevo.
- **Acciones**: a partir de C01 se trabaja con el sistema de spec (epics/stories/tasks) y todas las historias entran a un ciclo desde el inicio.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias inscritas (4)

**Progreso:** 4/4 en producción (100%) · En producción: 4

| ID | Título | Épica | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-001](../stories/US-001-autenticacion-clerk/index.md) | Autenticación con Clerk | E01 | En producción | P0 |
| [US-002](../stories/US-002-multitenancy-clerk-organizations/index.md) | Multitenancy con Clerk Organizations | E01 | En producción | P0 |
| [US-003](../stories/US-003-super-admin-plataforma/index.md) | Super admin de plataforma | E01 | En producción | P1 |
| [US-004](../stories/US-004-onboarding-local-dev/index.md) | Onboarding de desarrollo local | E01 | En producción | P1 |

<!-- DASHBOARD:END -->
