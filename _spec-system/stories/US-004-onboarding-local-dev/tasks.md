---
id: US-004
---

# Tasks — US-004 · Onboarding de desarrollo local

> Historia en producción.

## Onboarding

- [x] **T1 — Guía `GETTING-STARTED.md`**
  - Archivos: `docs/GETTING-STARTED.md`
  - Commits: `1f81eda`, `2cbe51c`

- [x] **T2 — Script `dev-tunnel.sh` (túnel SSH a Postgres dev)**
  - Archivos: `scripts/dev-tunnel.sh`
  - Commits: `1f81eda`

- [x] **T3 — Carga de `.env` en el dev script del backend**
  - Archivos: `apps/backend/package.json` (script `dev`)
  - Commits: `2cbe51c`

- [x] **T4 — Plantillas `.env.example`**
  - Archivos: `apps/backend/.env.example`, `apps/frontend/.env.example`
  - Commits: `1f81eda`

## Research consultada

_(ninguna)_

## Notes

- Requiere alias `dokploy` en `~/.ssh/config` apuntando a `woofly@195.26.253.145`.
- En el túnel SSH, el puerto remoto varía según la opción (A `8679` / B `8678`).
