---
id: E01
title: Fundamentos — autenticación y multitenancy
status: done
owner: @diego
---

## Objetivo

Tener la base sobre la que se construyen todas las funcionalidades de producto: identidad de usuarios, aislamiento por tenant, rol de super admin de plataforma y un entorno local productivo.

## Alcance

**Dentro**:
- Autenticación de usuarios con Clerk (frontend wrap + verificación en backend).
- Multitenancy basada en Clerk Organizations (`org_id` → `tenants.id`).
- Rol de super admin de plataforma (allowlist + metadata) con panel `/admin`.
- Onboarding local: túnel SSH a Postgres de dev, guía de arranque, carga de `.env` en el dev script.

**Fuera**:
- Registro de número WhatsApp (épica E02).
- Integración con Chatwoot (épica siguiente).
- Facturación / cuotas por tenant.

## Criterios de salida

- [x] Un usuario puede registrarse, crear su organización y verse a sí mismo como `org:admin`.
- [x] El backend rechaza requests sin token y aplica aislamiento por `tenantId`.
- [x] Un super admin puede listar/bloquear tenants desde `/admin`.
- [x] Un dev nuevo puede levantar el proyecto siguiendo `docs/GETTING-STARTED.md` en ~15 min.

> La lista de historias relacionadas se mantiene en el bloque auto-generado al final, vía `_system/scripts/dashboards.mjs`.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (4)

**Progreso:** 4/4 en producción (100%) · En producción: 4

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-001](../stories/US-001-autenticacion-clerk/index.md) | Autenticación con Clerk | C00 | En producción | P0 |
| [US-002](../stories/US-002-multitenancy-clerk-organizations/index.md) | Multitenancy con Clerk Organizations | C00 | En producción | P0 |
| [US-003](../stories/US-003-super-admin-plataforma/index.md) | Super admin de plataforma | C00 | En producción | P1 |
| [US-004](../stories/US-004-onboarding-local-dev/index.md) | Onboarding de desarrollo local | C00 | En producción | P1 |

<!-- DASHBOARD:END -->
