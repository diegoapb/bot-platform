---
id: US-004
title: Onboarding de desarrollo local
epic: E01
cycle: C00
status: En producción
priority: P1
estimate: S
owner: @diego
---

# US-004 · Onboarding de desarrollo local

**Como** desarrollador nuevo en el proyecto, **quiero** poder levantar backend + frontend en mi máquina en ~15 minutos, **para** empezar a contribuir sin pelearme con la infra.

Sin DB local: Postgres vive en Dokploy y se accede vía **túnel SSH**. Un script lo abre con un comando.

## Capacidades entregadas (en lugar de `requirements.md`)

1. **Guía paso a paso**: `docs/GETTING-STARTED.md` cubre instalación, Clerk, túnel a Postgres, migraciones y arranque (~15 min).
2. **Túnel SSH a Postgres**: `scripts/dev-tunnel.sh` mapea `localhost:5432` → puerto de la DB de dev en el host Dokploy. Funciona para Opción A (`botplatform-dev`) y Opción B (Postgres compartido `labs`).
3. **Carga de `.env` en dev**: el script de arranque del backend lee `.env` automáticamente, sin necesidad de `dotenv` manual ni envvars exportadas a mano.
4. **Verificación rápida**: endpoints `/health` y `/health/ready` confirman que app y DB responden tras el setup.
5. **Troubleshooting**: la guía documenta los errores más comunes (túnel cerrado, claves cruzadas, sin org activa).

## Arquitectura entregada (en lugar de `design.md`)

```
Mac dev ──ssh -L 5432:localhost:8679──▶ host Dokploy ──▶ contenedor postgres dev
   │
   ├─ apps/backend (Hono :3000) ─DATABASE_URL=…@localhost:5432─▶ túnel
   └─ apps/frontend (Vite :5173) ─proxy /api─▶ backend
```

**Archivos clave**
- `docs/GETTING-STARTED.md` — guía de onboarding.
- `scripts/dev-tunnel.sh` — túnel SSH parametrizable (`LOCAL_PORT`, `REMOTE_PORT`, `DOKPLOY_SSH`).
- `apps/backend/package.json` — el script `dev` carga `.env` antes de arrancar Hono.
- `apps/backend/.env.example` — plantilla con todas las vars necesarias.
- `apps/frontend/.env.example` — `VITE_CLERK_PUBLISHABLE_KEY` y `VITE_API_URL`.

**Decisión**: sin Docker local ni Postgres local. Reduce setup y garantiza que dev consume el mismo motor que prod.

## Documentos

- [Requerimientos](./requirements.md) — _stub: ver índice._
- [Diseño](./design.md) — _stub: ver índice._
- [Tareas](./tasks.md) — commits y archivos modificados.
