---
date: 2026-06-11
start: "14:21" # hora aproximada (hora de generación del reporte; el bloque empezó poco antes)
end: "14:21"
epic: E08
stories: [US-014]
agent: claude-fable-5
participants: [@diego]
tags: [deploy, dokploy, cloudflare, dns, produccion]
---

# Guía de salida a producción (Dokploy + Cloudflare)

## Resumen ejecutivo

- Se redactó la **guía paso a paso de salida a producción** en `docs/DEPLOY-PROD.md`: DNS en Cloudflare, DB en el Postgres compartido, Clerk live, proyecto/compose/dominios en Dokploy, environment, deploy, smoke y primer tenant real.
- Incluye tabla de troubleshooting (LetsEncrypt vs proxy naranja, webhooks 401, bot sin responder, fuentes `failed`) y checklist post-deploy (rotación de la API key temporal).
- Es el cierre documental de T6/T7 de US-014: **la ejecución del deploy sigue pendiente** de los insumos del usuario (DNS, secretos live, GitHub provider).
- Este bloque es continuación de la misma sesión que los reportes `0906` (E05–E07) y `1030` (E08 + fix anti-loop).

## Contexto inicial

El usuario pidió: "redacta un paso a paso para hacer la salida a producción por medio de dokploy y cloudflare".

## Épica y stories tocadas

- **Épica**: E08 — Operación y observabilidad MVP.
- **Stories**:
  - `US-014` — sin cambio de estado (`En implementación`); se documentó el procedimiento de T6 (deploy) y T7 (smoke en prod).

## Decisiones tomadas

1. DNS inicia en modo **DNS only (gris)** en Cloudflare para que Traefik/LetsEncrypt emita certificados; proxy naranja opcional después con SSL Full (strict).
2. DB de producción **separada de dev** (user/DB `botplatform` en el Postgres `labs`), recomendado en la guía.
3. `EVOLUTION_WEBHOOK_TOKEN` y `WEBHOOK_SECRET` de prod se **generan nuevos** (no se reutilizan los de dev).

## Cambios en el repo

- `docs/DEPLOY-PROD.md` — nuevo. Commit `ed1edd8`.

## Pendientes / próximos pasos

- [ ] Ejecutar el deploy siguiendo la guía (requiere insumos de @diego, ver Bloqueos).
- [ ] Smoke en prod (`scripts/smoke-prod.mjs`) tras el deploy.
- [ ] Rotar la `ANTHROPIC_API_KEY` temporal y configurar `OPENAI_API_KEY`.

## Bloqueos

Mismos que el reporte `1030`: DNS en Cloudflare, secretos de producción (Clerk live, tokens, passwords), y repo accesible desde el Git Provider de Dokploy.

## Referencias

- Guía creada: `docs/DEPLOY-PROD.md` · Infra: `infra/dokploy/README.md`.
- Reportes previos de la sesión: `0906-E06-implementacion-e05-e06-e07.md`, `1030-E08-implementacion-e08-panel-operacion.md`.
- **Conversación completa**: archivo hermano `*-RAW-*.md` que generará el hook `SessionEnd` al cerrar la sesión (mismo directorio).
