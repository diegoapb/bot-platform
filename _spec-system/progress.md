# Bitácora de avances

> Entrada nueva arriba. Formato: `## YYYY-MM-DD — título corto`.

## 2026-06-07 — Modelo de spec definido (épicas/historias/ciclos/informes)

- Historia = **carpeta** con 3 docs: `requirements.md` (frontmatter + Gherkin), `design.md`, `tasks.md`.
- Relación 1:N épica ↔ historia. Una historia, **un solo** ciclo (o ninguno).
- Estados de historia: lista cerrada (de "Levantamiento de requerimientos" a "En producción").
- Carpetas nuevas: `cycles/`, `informes/`, `scripts/`.
- `roadmap.md` ahora se **autogenera** con `node _spec-system/scripts/roadmap.mjs`. El script valida estados y referencias.

## 2026-06-07 — Spec system inicializada

Creada carpeta `_spec-system/` con PRD, arquitectura, tech stack y carpetas para épicas/historias. Punto de partida para documentar producto de forma viva.

## 2026-06-06 — Tunnel Cloudflare para dev móvil

- Tunnel `bot-plataform-dev` + CNAME `bot-dev.tusolvex.com` (proxied).
- `vite.config.ts` ajustado: `host: true`, `allowedHosts`, HMR `wss://...:443`.
- Scripts `pnpm tunnel` y `pnpm dev:mobile`.
- `CORS_ORIGIN` del backend incluye el host del túnel (alimenta `authorizedParties` de Clerk).
