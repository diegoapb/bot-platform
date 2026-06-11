---
date: 2026-06-11
start: "09:06" # hora aproximada (hora de generación del reporte; inicio real ~1h antes)
end: "09:06"
epic: E06
stories: [US-009, US-010, US-011, US-012, US-013]
agent: claude-fable-5
participants: [@diego]
tags: [knowledge-base, embeddings, catalogo, reply-engine, handoff, memoria, anthropic, openai]
---

# Implementación de épicas E05, E06 y E07

## Resumen ejecutivo

- Se implementaron de punta a punta **E05 (Base de conocimiento y catálogo)**, **E06 (Motor conversacional)** y **E07 (Memoria por cliente)**: schema + 2 migraciones aplicadas, integraciones (embeddings OpenAI, LLM Anthropic), 7 servicios nuevos, 4 routers nuevos y 4 tabs nuevas de UI.
- **Desviación de diseño importante**: el Postgres de Dokploy **no tiene pgvector disponible** (verificado: `pg_available_extensions` sin `vector`). Los embeddings se guardan como `jsonb` y la similitud coseno se calcula in-process — contrato `retrieve()` intacto para migrar a pgvector después.
- Todo el monorepo tipa limpio y el frontend compila; el backend arranca contra la DB de dev.
- Se verificó con smoke tests contra la DB real: chunker (cobertura 100%), búsqueda full-text en español con stemming y aislamiento por bot, archivado excluido del search, import CSV con reporte por fila, máquina de estados con auditoría e idempotencia, lock de conversación, upsert/wipe de memoria.
- **Bloqueo para e2e**: no hay `ANTHROPIC_API_KEY` ni `OPENAI_API_KEY` en el entorno. Se hicieron opcionales en el env con degradación elegante (fuentes a `failed`, conversaciones a `human`, job de memoria desactivado) — hay que configurarlas para probar el pipeline completo.

## Contexto inicial

El usuario pidió: "ejecuta las épicas E05, E06 y E07", con el informe del avance anterior (`0153-E02-implementacion-e02-e03-e04.md`) y la URL pública `https://bot-dev.tusolvex.com/`.

## Épica y stories tocadas

- **Épicas**: E06 — Motor conversacional (dominante, P0), E05 — Base de conocimiento y catálogo, E07 — Memoria por cliente.
- **Stories** (todas pasaron de `Pendiente desarrollo` → `Pendiente de pruebas`):
  - `US-009` — Gestión e ingestión de conocimiento: T1–T6 hechas; T7 (tests) pendiente.
  - `US-010` — Catálogo de productos y servicios: T1–T5 hechas; T6 (tests) pendiente.
  - `US-011` — Pipeline de respuesta automática: T1–T5 hechas; T6–T7 (tests) pendientes.
  - `US-012` — Handoff bot ↔ agente humano: T1–T5 hechas; T6 (tests) pendiente.
  - `US-013` — Memoria persistente por cliente: T1–T5 hechas; T6 (tests) pendiente.

## Decisiones tomadas

1. **Embeddings sin pgvector**: columna `jsonb` + coseno in-process en `retrieve()`. El Postgres de Dokploy no trae la extensión; cambiar la imagen es decisión de infra del usuario. Deuda documentada en `schema.ts` y aquí. A escala MVP (miles de chunks/bot) el costo es <50ms.
2. **API keys de IA opcionales en el env** (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`): no rompen el arranque; cada servicio degrada con error claro. Defaults: `text-embedding-3-small` y `claude-haiku-4-5-20251001` (económico), `LLM_TIMEOUT_MS=12000`.
3. **Clientes LLM/embeddings con fetch directo** (sin SDKs), consistente con los clientes existentes de Evolution/Chatwoot.
4. **Columna `search tsvector` solo en SQL** (migración custom `0004_catalog_search.sql`, generada con `drizzle-kit generate --custom`): drizzle no modela columnas generadas tsvector; las queries usan `sql\`\``. Fallback ILIKE cuando el término no produce lexemas.
5. **Una conversación viva por contacto** (unique en `conversations.channel_link_id`): simplifica resolución webhook→conversación en MVP.
6. **Lock de generación en DB** (`locked_at` con TTL 60s, UPDATE condicional atómico) + **debounce de ráfagas en memoria** (8s, `Map` por conversación). Limitación documentada: 1 réplica de backend.
7. **`request_human` como tool del LLM** cubre tanto la solicitud explícita del cliente como el escalamiento por desconocimiento (P4: el texto del LLM se descarta; solo va la plantilla `bots.handoff_message`).
8. **Anti-loop**: el reply del bot se crea en Chatwoot vía API (sin `sender`) → el filtro existente de `handleAgentReply` lo ignora; `fromMe` ya filtra el eco de Evolution.
9. **Historial de conversación desde Chatwoot** (`listMessages`), no se duplica almacenamiento local de mensajes; se normaliza alternancia user/assistant para el Messages API.
10. **Consolidación de memoria marca `consolidated_at` incluso ante fallo** (per spec): evita reintentos en loop; la memoria previa queda intacta (P2).
11. **Middleware scopeado en routers montados en `/api`** (`conversations`, `contacts`): un `use("*")` habría aplicado `requireTenant` a `/api/admin` y bloqueado al super admin sin org activa.

## Cambios en el repo

**Commits**: `2416ed2` (implementación completa), `5ebed2f` (SHAs en tasks.md).

**Backend** (`apps/backend`):
- `src/db/schema.ts` — enums y tablas: `knowledge_sources`, `knowledge_chunks`, `catalog_items`, `conversations`, `generations`, `conversation_transitions`, `contact_memories`, `contact_facts`; `bots.handoff_message`.
- `drizzle/0003_neat_the_twelve.sql` + `0004_catalog_search.sql` — aplicadas en dev.
- `src/integrations/embeddings.ts`, `src/integrations/llm.ts` — nuevos; `chatwoot.ts` ampliado (listMessages, labels, priority).
- `src/services/`: `chunker.ts`, `knowledge.ts`, `catalog.ts`, `conversation-state.ts`, `context-builder.ts`, `reply-engine.ts`, `memory.ts` (nuevos); `message-sync.ts` engancha el motor tras el sync.
- `src/jobs/memory-consolidation.ts` — job 15 min, guard anti-solape.
- `src/routes/`: `knowledge.ts`, `catalog.ts`, `conversations.ts`, `contacts.ts` (nuevos); `webhooks.ts` maneja `conversation_updated`; `index.ts` monta todo y arranca el job.
- `src/env.ts` + `.env.example` — vars de IA nuevas.
- Deps: `pdf-parse` (v2, API `PDFParse`), `papaparse`.

**Shared** (`packages/shared`): schemas de conocimiento, catálogo (con `CURRENCIES` ISO), conversaciones y memoria.

**Frontend** (`apps/frontend`):
- `src/lib/api.ts` — métodos nuevos + helper `requestForm` (multipart).
- `src/pages/bots/`: `KnowledgeManager.tsx` (upload drag&drop, FAQ, playground con scores, auto-refresh de estados), `CatalogManager.tsx` (tabla con filtros, CRUD, import CSV con reporte), `ConversationsPanel.tsx` (badges de modo, tomar/devolver/pausar, historial de transiciones, polling 5s), `ContactsPanel.tsx` (hechos editables con origen, resumen, wipe con doble confirmación).
- `BotDetailPage.tsx` — 4 tabs nuevas.

**Spec-system**: tasks marcadas, stories a `Pendiente de pruebas`, dashboards regenerados.

## Validación

- `pnpm -r typecheck` limpio (shared, backend, frontend) + `vite build` OK.
- Backend arranca contra la DB de dev (`/health` OK); migraciones aplicadas y verificadas (`\d catalog_items` con tsvector + GIN).
- Smoke tests contra DB real (sin mocks): chunker con cobertura 100%, búsqueda "camisetas"→"Camiseta azul" (stemming es), aislamiento entre bots, archivado fuera del search, búsqueda por atributos, import CSV 2 creadas/2 rechazadas con motivos, `setMode` con auditoría e idempotencia, lock serializa, facts upsert por clave y wipe.

## Pendientes / próximos pasos

- [ ] Configurar `OPENAI_API_KEY` y `ANTHROPIC_API_KEY` en `.env` de dev y en Dokploy (sin ellas no hay indexado ni respuestas del bot).
- [ ] Prueba e2e real: WhatsApp → bot responde con conocimiento/catálogo → "quiero un humano" → handoff → devolución al bot.
- [ ] Tests automatizados (T7 US-009, T6 US-010/012/013, T6–T7 US-011) — sigue sin harness vitest en el repo.
- [ ] Migrar embeddings a pgvector cuando el Postgres de Dokploy use imagen `pgvector/pgvector` (deuda registrada).
- [ ] Probar las 4 tabs nuevas desde la UI en `https://bot-dev.tusolvex.com/`.

## Bloqueos

- **API keys de IA**: no existen en el entorno ni en el repo de cloud-manager. Requiere que @diego las provea (OpenAI para embeddings, Anthropic para el motor).

## Referencias

- Specs: `_spec-system/epics/E05..E07`, `_spec-system/stories/US-009..US-013`.
- Informe previo: `sessions/2026-06-11/0153-E02-implementacion-e02-e03-e04.md`.
- **Conversación completa**: archivo hermano `*-RAW-*.md` que generará el hook `SessionEnd` al cerrar la sesión (mismo directorio).
