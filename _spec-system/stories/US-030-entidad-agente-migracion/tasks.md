---
id: US-030
---

# Tasks — US-030 · Entidad Agente y migracion bot->agente

## Overview

Primero el modelo de datos: tabla `agents` + enum y `agent_id` en `identity_documents` (T1). Sobre eso, la migracion idempotente de backfill (T2) y el servicio de agentes con resolucion de modelo (T3). Luego se re-cablea la identidad por agente (T4) y el cliente LLM + reply-engine para el modelo efectivo (T5). Cierra con tests de migracion, aislamiento y continuidad (T6).

## Tasks

- [ ] **T1 — Migracion Drizzle: tabla `agents` + enum `agent_status` + `agent_id` en `identity_documents`**
  - Archivos: `apps/backend/drizzle/00XX_agents.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: `pnpm db:migrate` crea `agents` con columnas (id, tenant_id, created_by, name, status, model, extraction_schema, whitelist_enabled, handoff_message, created_at, updated_at), enum `agent_status` = draft/active/paused, `model` nullable, indice `agents_tenant_idx`; `identity_documents` gana `agent_id` (nullable en este paso) con FK a `agents` on delete cascade.
  - FAIL si: nombres/tipos divergen del data model del diseño o `model` queda NOT NULL.
  - Properties: P1, P3
  - Requirements: 1.1, 1.2, 1.3

- [ ] **T2 — Backfill idempotente bot->agente + re-apunte de identidad + `agent_id` NOT NULL**
  - Archivos: `apps/backend/drizzle/00XX_agents.sql`
  - PASS si: INSERT crea 1 agente por bot (model NULL) copiando name/status/extraction_schema/whitelist_enabled/handoff_message/tenant_id/created_by con `WHERE NOT EXISTS`; UPDATE pone `identity_documents.agent_id = agente(bot_id)` solo donde es NULL; tras verificar 0 nulos aplica `SET NOT NULL`; re-ejecutar no crea agentes ni filas duplicadas.
  - FAIL si: un bot genera dos agentes, o queda algun `identity_document` con `agent_id` nulo, o se pierde alguna version.
  - Properties: P1, P2
  - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2

- [ ] **T3 — `agentService`: create + getForTenant + resolveAgentForBot + resolveModel**
  - Archivos: `apps/backend/src/services/agents.ts`
  - PASS si: `create` aplica `status='draft'` por defecto y persiste tenant/autor; `getForTenant` filtra por tenant y devuelve null cross-tenant; `resolveAgentForBot` es idempotente (crea el agente del bot si falta, devuelve el existente si ya esta); `resolveModel` devuelve `agent.model ?? env.LLM_MODEL`.
  - FAIL si: `resolveModel` devuelve null/vacio, o `getForTenant` filtra agente de otro tenant, o `resolveAgentForBot` crea un segundo agente para un bot ya migrado.
  - Properties: P1, P3, P4, P5
  - Requirements: 1.1, 1.2, 1.4, 1.5, 4.1, 4.2, 5.1, 5.2

- [ ] **T4 — Re-cablear `identity` a `agentId`**
  - Archivos: `apps/backend/src/services/identity.ts`
  - PASS si: `getCurrent/save/listVersions/restore/compileIdentity` operan sobre `identity_documents.agentId`; la vigente por tipo es la de mayor version del agente; `save` asigna version = max+1 por `(agentId, type)` con el unique como lock; versiones de agentes distintos son independientes.
  - FAIL si: `save` pisa una version existente o mezcla versiones entre agentes.
  - Properties: P2
  - Requirements: 3.3, 3.4, 3.5, 5.3

- [ ] **T5 — Modelo efectivo en `llm.generate` + `reply-engine`**
  - Archivos: `apps/backend/src/integrations/llm.ts`, `apps/backend/src/services/reply-engine.ts`
  - PASS si: `generate` acepta `model?` y usa el pasado o cae a `env.LLM_MODEL`; `reply-engine` resuelve el agente de la conversacion, pasa `model: resolveModel(agent)` y compila la identidad por agente; `generations.model` guarda el modelo efectivo realmente usado.
  - FAIL si: la generacion ignora `agent.model`, o `generations.model` registra el global cuando el agente tenia modelo propio.
  - Properties: P4, P5
  - Requirements: 4.3, 4.4, 5.1, 5.3, 5.4

- [ ] **T6 — Tests de migracion, aislamiento y continuidad**
  - Archivos: `apps/backend/test/agents-migration.test.ts`
  - PASS si: migrar 1..N veces deja conteo de agentes estable (P1); identidad multi-version se preserva 1:1 tras re-apunte (P2); lectura cross-tenant no filtra agentes (P3); `resolveModel` cubre ambos caminos (P4); mensaje entrante a bot migrado produce respuesta y `generations.model` correcto (P5).
  - FAIL si: algun test es no determinista o llama al LLM real (debe mockearse `generate`).
  - Properties: P1, P2, P3, P4, P5
  - Requirements: 2.1, 2.5, 3.1, 3.2, 4.1, 4.2, 5.1, 5.4

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2", "T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4", "T5"], "depends_on": [2] },
    { "id": 4, "tasks": ["T6"], "depends_on": [3] }
  ]
}
```

## Commits

- _(pendiente)_

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — vision del desacople agente/canal/conocimiento, decisiones D4 (migracion automatica e idempotente, 1 agente por bot) y D5 (identidad/prompt y modelo propios del agente), y la pregunta abierta Q1 (transporte legacy Evolution como canal, propiedad de US-031).

## Notes

- Supuesto: en esta fase se mantiene un mapeo 1:1 bot->agente (columna puente `legacy_bot_id` unique o tabla auxiliar) para que el ruteo del webhook resuelva el agente sin cambios; su retiro lo aborda US-031 al normalizar el transporte como canal.
- La columna `identity_documents.bot_id` se conserva durante la transicion para permitir rollback; su retiro se planifica cuando todo el pipeline use `agentId`.
- Fuera de alcance: asignacion de canales (US-031), colecciones de conocimiento (US-032), unificacion de contacto (US-033), UI de agentes (US-034) y ruteo multi-agente (E14).
- Dependencia de entorno: `env.LLM_MODEL` ya existe (`apps/backend/src/env.ts`); no se añade configuracion nueva.
