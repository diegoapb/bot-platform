---
id: US-038
---

# Tasks — US-038 · Resolucion y fijacion del agente al inicio de la conversacion

## Overview

Primero el modelo (T1: `conversations.agent_id` no nulo + `conversation_routing_decisions`). Luego el `resolve` puro encadenado (T2) y el `resolveAndFix` idempotente (T3) sobre el motor de reglas (US-036), el orquestador (US-037) y el default (US-035). Despues se conecta al punto de creacion de la conversacion (T4) y se migra el pipeline de inbound a `agent_id` (T5). La ruta de auditoria (T6) y los tests de extremo a extremo (T7) cierran la historia.

## Tasks

- [ ] **T1 — Migracion: `conversations.agent_id` + `closed_at` + `conversation_routing_decisions`**
  - Archivos: `apps/backend/drizzle/00XX_conversation_agent.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: `conversations.agent_id` queda `not null fk agents.id on delete restrict` con poblado de filas existentes (agente del bot migrado); se anade `conversations.closed_at timestamptz null`; el `unique(channel_link_id)` total se reemplaza por el `unique(channel_link_id) WHERE closed_at IS NULL` (parcial); existe `conversation_routing_decisions` con `unique(conversation_id)`, fk a `conversations`/`agents`/`routing_rules`; existe el indice `conversations_agent_idx`.
  - FAIL si: `agent_id` queda nullable, persiste el `unique(channel_link_id)` total (impide re-resolver tras cierre), faltan FKs/uniques del data model, o la migracion no es idempotente.
  - Properties: P2, P4, P6
  - Requirements: 2.1, 3.3, 5.1, 7.1, 7.4

- [ ] **T2 — `agentResolver.resolve`: cadena reglas -> orquestador -> default**
  - Archivos: `apps/backend/src/services/agent-resolver.ts`
  - PASS si: devuelve agente de regla cuando `routingEngine.evaluate` decide; en no-match invoca `orchestrator.route`; cae al `channels.default_agent_id` si ninguno decide; descarta agente no candidato y avanza; tolera excepcion del orquestador derivando al default; lanza `NoServiceableAgentError` sin default ni decision; `cause` coincide con el eslabon usado.
  - FAIL si: consulta un eslabon posterior tras una decision valida previa, o fija un agente no candidato del canal.
  - Properties: P1, P5, P7, P8, P9
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.1, 6.2, 6.3

- [ ] **T3 — `agentResolver.resolveAndFix`: creacion idempotente + causa**
  - Archivos: `apps/backend/src/services/agent-resolver.ts`
  - PASS si: si ya existe conversacion ABIERTA (`closed_at IS NULL`) para el `channel_link_id` la devuelve sin re-resolver; si no, inserta `conversations` con `agent_id` via `ON CONFLICT (channel_link_id) WHERE closed_at IS NULL DO NOTHING` y registra una fila en `conversation_routing_decisions` con `ON CONFLICT (conversation_id) DO NOTHING`; ante carrera reutiliza la conversacion abierta existente.
  - FAIL si: dos invocaciones concurrentes crean dos conversaciones o dos causas, o reprocesar reasigna el agente.
  - Properties: P3, P6, P7
  - Requirements: 2.3, 5.2, 5.3, 5.4, 6.4, 7.1, 7.2, 7.3, 7.4

- [ ] **T4 — Integrar resolver en `ensureConversation` y bloquear cambio en caliente**
  - Archivos: `apps/backend/src/services/conversation-state.ts`
  - PASS si: `ensureConversation` delega en `resolveAndFix` cuando no hay conversacion ABIERTA (`closed_at IS NULL`) para el `channel_link_id`; conversaciones nuevas tras cierre re-resuelven y coexisten con la cerrada; mensaje posterior de una conversacion abierta reutiliza el agente fijado; un intento de cambiar `agent_id` de una conversacion viva es rechazado; se expone `getAgentForConversation`.
  - FAIL si: una conversacion viva cambia de agente, o una conversacion nueva no re-resuelve.
  - Properties: P2, P3, P4
  - Requirements: 2.2, 2.4, 3.1, 3.2, 3.3

- [ ] **T5 — Pipeline de inbound por `agent_id` fijado (no `botId`)**
  - Archivos: `apps/backend/src/services/channel-inbound.ts`, `apps/backend/src/services/context-builder.ts`, `apps/backend/src/services/reply-engine.ts`
  - PASS si: `handleChannelMessage` usa `conversation.agent_id`; `context-builder` construye identidad con `identity.getIdentity(agentId)` y conocimiento con `knowledge.retrieve(agentId, ...)`; `reply-engine` atribuye `generations.agent_id` al agente fijado.
  - FAIL si: algun paso del pipeline sigue resolviendo `botId` para identidad, conocimiento o generacion.
  - Properties: P2
  - Requirements: 4.1, 4.2, 4.3

- [ ] **T6 — Ruta `GET /api/conversations/:id/routing`**
  - Archivos: `apps/backend/src/routes/conversations.ts`
  - PASS si: devuelve `{ agentId, cause }` (regla con `ruleId`, orquestador o default) leyendo `conversations`/`conversation_routing_decisions`; aislada por `tenantId`; 404/403 para conversacion de otro tenant.
  - FAIL si: filtra ruteo de otra organizacion o no refleja la causa registrada.
  - Properties: P9
  - Requirements: 5.5

- [ ] **T7 — Tests de resolucion, fijacion e idempotencia**
  - Archivos: `apps/backend/test/agent-resolver.test.ts`
  - PASS si: escenario de aceptacion (mismo canal: `post_sale`->garantias, `pre_sale`->informacion); orden de cadena por rama; reentrada/concurrencia deja 1 conversacion + 1 causa; conversacion nueva tras cierre re-resuelve sin tocar la cerrada; fallback ante orquestador caido; aislamiento cross-tenant; con motor de reglas y orquestador mockeados deterministas.
  - FAIL si: los tests dependen del orquestador LLM real o no son deterministas.
  - Properties: P1, P4, P5, P6, P7, P8, P9
  - Requirements: 1.1, 1.5, 3.1, 6.1, 6.2, 7.1, 7.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2"], "depends_on": [1] },
    { "id": 3, "tasks": ["T3"], "depends_on": [2] },
    { "id": 4, "tasks": ["T4", "T6"], "depends_on": [3] },
    { "id": 5, "tasks": ["T5"], "depends_on": [4] },
    { "id": 6, "tasks": ["T7"], "depends_on": [5] }
  ]
}
```

## Commits

_(pendiente)_

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — decisiones D1 (ruteo hibrido reglas->orquestador->default) y D3 (agente fijado al inicio, sin cambio en caliente, re-resolucion en conversacion nueva); fundamenta T2, T3 y T4.

## Notes

- Depende de US-036 (`routingEngine.evaluate`), US-037 (`orchestrator.route`) y US-035 (`agent_channels`, `channels.default_agent_id`, `contacts.stage`); si T7 corre antes de que existan, mockear esas interfaces deterministas.
- Supuesto: la migracion 1-bot-1-agente (US-030) ya poblo el agente de cada bot, por lo que `conversations.agent_id` puede volverse `not null` sin perdida (D4).
- Supuesto: el canal legacy WhatsApp/Evolution ya esta representado como canal con candidatos/default segun la decision de US-031; el resolver opera sobre `channelId` uniforme.
