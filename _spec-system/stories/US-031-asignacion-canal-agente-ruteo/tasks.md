---
id: US-031
---

# Tasks — US-031 · Asignación N:M canal-agente y ruteo de inbound por agente

## Overview

Primero el modelo: tipo `whatsapp_evolution`, tabla `agent_channels` y `conversations.agent_id` (T1). Luego el servicio de asignación con el invariante (T2) y el resolver de ruteo (T3), que son la base del pipeline reescrito (T4–T5). Las rutas exponen la gestión (T6). La migración idempotente normaliza el canal legacy y siembra los enlaces (T7). Cierra con tests de invariante, ruteo, fijación e idempotencia (T8). La UI queda fuera (US-034).

## Tasks

- [x] **T1 — Migración Drizzle: `whatsapp_evolution`, `agent_channels`, `conversations.agent_id`**
  - Archivos: `apps/backend/drizzle/00XX_agent_channels.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: `pnpm db:migrate` aplica; `channel_type` incluye `whatsapp_evolution`; `agent_channels(id, tenant_id, agent_id fk, channel_id fk, created_at)` con `unique(channel_id)` e índices `(agent_id)`/`(tenant_id)`; `conversations.agent_id` (FK agents) creada con índice.
  - FAIL si: falta el `unique(channel_id)` o los nombres/tipos divergen del data model del diseño.
  - Properties: P1, P4
  - Requirements: 2.1, 5.1, 7.4

- [x] **T2 — `agentChannelService`: assign/unassign/list con invariante y tenant scope**
  - Archivos: `apps/backend/src/services/agent-channels.ts`
  - PASS si: assign de canal libre crea enlace; canal ocupado por otro agente → rechazo; mismo agente → idempotente; cross-tenant rechazado; unassign elimina; list devuelve sólo canales del agente.
  - FAIL si: dos enlaces para un mismo canal pueden coexistir, o una query no filtra por `tenant_id`.
  - Properties: P1, P4
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2

- [x] **T3 — `resolveChannelAgent`: ruteo por inbox y por instancia Evolution**
  - Archivos: `apps/backend/src/services/routing/resolve-agent.ts`
  - PASS si: `resolveByInbox` y `resolveByEvolutionInstance` devuelven `{channel, agent}` del tenant correcto; canal sin agente enlazado → `null`; nunca resuelve agente de otro tenant.
  - FAIL si: resuelve por `channel.botId` legado en vez de `agent_channels`, o cruza tenants.
  - Properties: P2, P4
  - Requirements: 4.1, 4.2, 4.4, 4.5

- [x] **T4 — `conversation-state`: fijar `agent_id` en conversaciones nuevas**
  - Archivos: `apps/backend/src/services/conversation-state.ts`
  - PASS si: `ensureConversation` persiste `agent_id` del agente resuelto al crear; si la conversación ya existe, su `agent_id` no se modifica; conversación nueva tras reasignación toma el agente vigente.
  - FAIL si: el `agent_id` de una conversación viva cambia al reasignar el canal.
  - Properties: P3
  - Requirements: 5.1, 5.2, 5.3, 5.4

- [x] **T5 — Reescritura del pipeline de inbound (botId → agentId)**
  - Archivos: `apps/backend/src/services/message-sync.ts`, `apps/backend/src/services/channel-inbound.ts`, `apps/backend/src/services/reply-engine.ts`, `apps/backend/src/services/context-builder.ts`
  - PASS si: el pipeline opera sobre el agente resuelto (identidad/modelo por agente); inbound por canal sin agente se descarta sin error visible; `tryMarkProcessed` y audiencia usan agente/canal resueltos.
  - FAIL si: algún punto del pipeline sigue resolviendo `bot` por `channel.botId`/instancia en lugar de `resolveChannelAgent`.
  - Properties: P2, P5
  - Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3

- [x] **T6 — Rutas `POST/GET/DELETE /api/agents/:id/channels`**
  - Archivos: `apps/backend/src/routes/agents.ts`, `apps/backend/src/index.ts`
  - PASS si: asignar válido → 200; canal ocupado → 409; cross-tenant → 403/404; listar devuelve canales del agente; desasignar → 200; sólo `org:admin` escribe, member lee.
  - FAIL si: acceso cross-tenant o un member puede asignar/desasignar.
  - Properties: P1, P4
  - Requirements: 1.1, 1.2, 1.3, 2.2, 3.1, 3.2

- [x] **T7 — Migración idempotente del canal legacy + siembra de `agent_channels`**
  - Archivos: `apps/backend/src/db/migrations/00XX_seed_agent_channels.ts`
  - PASS si: crea una fila `channels(type=whatsapp_evolution)` por agente con `evolutionInstance`; enlaza cada canal preexistente a su agente; rellena `channel_links.channel_id` del Evolution legado; segunda ejecución no duplica; conversaciones/mensajes intactos.
  - FAIL si: tras correr dos veces hay canales o enlaces duplicados, o un canal queda con ≠1 agente.
  - Properties: P6
  - Requirements: 7.1, 7.2, 7.3, 7.4

- [ ] **T8 — Tests: invariante, ruteo, fijación, multicanal e idempotencia**
  - Archivos: `apps/backend/test/agent-channels.test.ts`, `apps/backend/test/routing.test.ts`
  - PASS si: P1 con secuencias aleatorias assign/unassign; ruteo Evolution y Chatwoot al agente correcto; `agent_id` de conversación estable bajo reasignación (P3); agente con 2 canales recibe inbound de ambos (P5); aislamiento entre tenants (P4); migración N veces idempotente (P6).
  - FAIL si: algún test no es determinístico o llama a servicios externos reales.
  - Properties: P1, P2, P3, P4, P5, P6
  - Requirements: 2.1, 3.3, 3.4, 4.1, 4.2, 5.2, 5.3, 6.1, 7.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2", "T3", "T4"], "depends_on": [1] },
    { "id": 3, "tasks": ["T5", "T6", "T7"], "depends_on": [2] },
    { "id": 4, "tasks": ["T8"], "depends_on": [3] }
  ]
}
```

## Commits

- 2026-06-18 · E13 implementado (solo implementación; tests pendientes por decisión). Migraciones `0008_milky_magma.sql` (+enum whatsapp_evolution) y `0009_spicy_sharon_carter.sql` (DDL + backfill idempotente + NOT NULL), aplicadas y verificadas en dev. Typecheck monorepo OK.

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — fundamentó la relación N:M canal-agente (D1 estructura), la fijación del agente al inicio de la conversación (D3) y la migración automática e idempotente bot→agente / canal legacy (D4).

## Notes

- Depende de US-030 (renombrado bot→agent y tabla `agents`); las tareas asumen que `agents` ya existe.
- La relación N:M se mantiene restringida con `unique(channel_id)`; el relajamiento para varios agentes por canal y las reglas de ruteo llegan en E14 (US-036..US-038). No retirar el `unique` en esta historia.
- Las columnas de Evolution en la tabla de agentes (ex-`bots`) quedan como espejo de solo lectura tras T7; su retirada es una historia posterior.
- Supuesto a confirmar con el humano: unificación histórica de `channel_links.phoneE164` no aplica aquí (es de US-033, contactos por agente).
