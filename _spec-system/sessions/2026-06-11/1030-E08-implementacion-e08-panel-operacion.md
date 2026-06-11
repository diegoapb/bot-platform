---
date: 2026-06-11
start: "10:30" # hora aproximada del bloque E08 (misma sesión que el reporte 0906)
end: "10:30"
epic: E08
stories: [US-014]
agent: claude-fable-5
participants: [@diego]
tags: [panel, metricas, trazas, healthcheck, dokploy, anti-loop, anthropic]
---

# Implementación de E08 — Panel de operación (+ fix anti-loop y API key)

## Resumen ejecutivo

- **Bloque 1 — API key y modelo**: se configuró `ANTHROPIC_API_KEY` (temporal, de pruebas) en el `.env` de dev con `LLM_MODEL=claude-haiku-4-5-20251001`; el switch a Opus para demos quedó documentado como una línea comentada. Key verificada con llamada real.
- **Bloque 2 — Bug "bucle de mensajes"**: cada respuesta del bot se reenviaba duplicada a WhatsApp. Causa raíz: Chatwoot asigna `sender` (el dueño de `CHATWOOT_API_TOKEN`) a los mensajes creados por API, así que el filtro anti-rebote por "sender ausente" nunca aplicó. Fix: `content_attributes.from_bot` + dedupe por id (`c8eb9e5`).
- **Bloque 3 — E08/US-014**: endpoints de conversaciones tenant-wide (cursor estable), mensajes con origen, métricas 7/30d con serie diaria, trazas de generaciones (tenant y super admin), health extendido con cache, UI completa (ConversationsList/View, MetricsDashboard con recharts, GenerationsLog) y scaffolding de producción actualizado (compose, .env.example, smoke script).
- **Pendiente principal: el despliegue a producción (T6) no se ejecutó** — requiere decisiones/secretos del usuario (ver Bloqueos).
- Smoke local OK: health con 3 checks arriba, webhooks rechazan tokens inválidos, typecheck y build limpios.

## Contexto inicial

Tres peticiones encadenadas del usuario: configurar la API key temporal usando Haiku (con opción de cambiar a Opus para demos), diagnosticar "se quedó enviando mensajes en bucle", y "ejecuta la última épica y dime qué haría falta".

## Épica y stories tocadas

- **Épica**: E08 — Operación y observabilidad MVP.
- **Stories**:
  - `US-014` — pasó de `Pendiente desarrollo` → `En implementación`. T1–T5 hechas; T6 (deploy Dokploy) y T7 (smoke en prod) abiertas. El smoke script ya existe y pasó contra local.

## Decisiones tomadas

1. **Anti-loop por marca explícita** (`content_attributes.from_bot`) en lugar de heurística por sender — el payload real demostró que la heurística era falsa. Dedupe por id como segunda barrera ante pérdida de attributes.
2. **Health siempre HTTP 200** (status `ok|degraded` en el body): un `degraded` por Evolution caído no debe provocar restart-loops del contenedor. `/health/live` aparte para el healthcheck de Docker.
3. **Cursor de paginación `(last_msg_at, id)`** compuesto — orden estable sin duplicados con actividad concurrente (P3).
4. **Handoffs en métricas = toda transición a `human`** (no solo `cause LIKE 'llm:%'` como decía el design): un takeover manual también es un handoff operativo. Desviación menor documentada aquí.
5. **Trazas solo para admin del tenant**: los prompts contienen historiales con datos personales de clientes finales.
6. **Historial de mensajes leído de Chatwoot** (sin almacén local de mensajes), origen derivado: `incoming`→cliente, `outgoing+from_bot`→bot, resto→agente.
7. **recharts** añadido para el gráfico de métricas (el design lo asumía disponible; no lo estaba).
8. **T6 preparado pero no ejecutado**: el deploy real implica DNS, secretos de producción (Clerk live, tokens) y conexión GitHub en Dokploy — decisiones del usuario.

## Cambios en el repo

**Commits**: `c8eb9e5` (fix anti-loop), `66be7bf` (E08), `a5f2cf2` (docs SHA).

- Backend: `routes/health.ts` (extendido + cache), `routes/conversations.ts` (lista cursor + mensajes), `routes/metrics.ts`, `routes/generations.ts` (nuevos), `routes/admin.ts` (+`GET /generations`), `integrations/chatwoot.ts` (listMessages enriquecido, contentAttributes en createMessage), `services/reply-engine.ts` y `message-sync.ts` (anti-loop).
- Frontend: `pages/conversations/ConversationsList.tsx`, `ConversationView.tsx`, `pages/metrics/MetricsDashboard.tsx`, `pages/bots/GenerationsLog.tsx` (nuevos); rutas en `App.tsx`, nav en `Layout.tsx`, tab Trazas en `BotDetailPage.tsx`; api.ts ampliado. Dep nueva: recharts.
- Infra: `infra/dokploy/docker-compose.yml` (env completo E02–E07+IA, healthcheck), `.env.example` actualizado, `README.md` (webhooks reales + smoke), `scripts/smoke-prod.mjs` (nuevo).
- `.env` dev: `ANTHROPIC_API_KEY` + `LLM_MODEL` (no versionado).

## Pendientes / próximos pasos

- [ ] **Deploy a producción (T6)**: ver Bloqueos — todo el scaffolding está listo.
- [ ] Smoke en prod (T7) tras el deploy: `node scripts/smoke-prod.mjs --backend https://api.bots.diegop.com --frontend https://bots.diegop.com`.
- [ ] `OPENAI_API_KEY` (dev y prod) — la base de conocimiento sigue sin indexar.
- [ ] Rotar la `ANTHROPIC_API_KEY` temporal al terminar las pruebas (quedó pegada en el chat / RAW).
- [ ] Tests automatizados de todas las stories (sin harness vitest aún).
- [ ] Probar el panel nuevo desde la UI (Conversaciones, Métricas, Trazas).

## Bloqueos

Para ejecutar el deploy (T6) hace falta de @diego:
1. **DNS**: `bots.diegop.com` y `api.bots.diegop.com` apuntando al host Dokploy (Cloudflare).
2. **Secretos de producción**: Clerk live (sk/pk, con Organizations), tokens de Evolution/Chatwoot, `ANTHROPIC_API_KEY` definitiva, `OPENAI_API_KEY`, password del Postgres `labs` (crear DB `botplatform` si no existe).
3. **GitHub**: repo `bot-plataform` accesible desde el provider conectado en Dokploy (el compose builda desde el monorepo).
4. Decisión sobre **Clerk dev vs prod**: hoy todo corre con la instancia de desarrollo.

## Referencias

- Specs: `_spec-system/epics/E08`, `_spec-system/stories/US-014`.
- Reporte del bloque anterior: `0906-E06-implementacion-e05-e06-e07.md`.
- Infra: `infra/dokploy/README.md` (pasos de deploy con la skill dokploy-api).
- **Conversación completa**: archivo hermano `*-RAW-*.md` que generará el hook `SessionEnd` al cerrar la sesión.
