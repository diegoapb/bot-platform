---
id: US-036
---

# Tasks — US-036 · Motor de reglas de ruteo declarativas

## Overview

Primero el DSL puro y su compilador/evaluador (T1, T2), que no tocan DB y son la base testeable con property-based. En paralelo, la migración de `routing_rules` (T3). Sobre ellos: la proyección `ContactView` y la función `evaluate` con I/O (T4), el servicio CRUD con validación de candidato (T5) y las rutas Hono (T6). Cierra con tests de propiedades e integración (T7) que dejan la historia terminada.

## Tasks

- [ ] **T1 — DSL de condición: tipos + `compileCondition`**
  - Archivos: `apps/backend/src/services/routing-dsl.ts`
  - PASS si: tipos `Field/Leaf/Condition` definidos; `compileCondition` acepta toda la gramática válida y lanza `CompileError` ante campo/operador/estructura no contemplados.
  - FAIL si: una condición con un operador o `var` fuera de la gramática se acepta sin error.
  - Properties: P7
  - Requirements: 4.4, 1.3

- [ ] **T2 — Evaluador puro del DSL: `evalCondition`**
  - Archivos: `apps/backend/src/services/routing-engine.ts`
  - PASS si: `evalCondition(cond, view)` implementa `eq/ne/in/exists/gt/gte/lt/lte/and/or/not`; campo ausente con op≠`exists` ⇒ falso; `tags` evalúa pertenencia; nunca lanza.
  - FAIL si: una comparación numérica sobre valor no numérico lanza, o `evalCondition` produce efectos secundarios.
  - Properties: P2, P7
  - Requirements: 4.1, 4.2, 4.3, 4.5

- [ ] **T3 — Migración Drizzle: tabla `routing_rules`**
  - Archivos: `apps/backend/drizzle/000X_routing_rules.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: `pnpm db:migrate` aplica; columnas `id, tenant_id, channel_id, priority, condition jsonb, agent_id, enabled, created_by, created_at, updated_at`; FK `channel_id`→channels cascade y `agent_id`→agents restrict; índice `(channel_id, priority, id)`.
  - FAIL si: nombres/tipos divergen del data model del diseño o falta el índice de orden.
  - Properties: P5, P6
  - Requirements: 1.1, 6.3

- [ ] **T4 — `projectContactView` + `evaluate` + `evalRules`**
  - Archivos: `apps/backend/src/services/routing-engine.ts`
  - PASS si: `projectContactView` arma `{stage, tags, hasPurchased, facts, extracted}` desde `contacts`/`contact_facts`/`extracted_data`; `evaluate` selecciona reglas habilitadas del tenant+canal `ORDER BY priority ASC, created_at ASC, id ASC`; `evalRules` devuelve `{agentId, ruleId}` de la primera aplicable o `null`; salta reglas cuyo agente ya no es candidato.
  - FAIL si: una regla deshabilitada o de otro tenant/canal influye en el resultado, o el no-match no devuelve `null`.
  - Properties: P1, P3, P4, P5, P6, P8
  - Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.3, 6.1, 6.2, 6.3

- [ ] **T5 — `routingRulesService`: CRUD + validación + reorder**
  - Archivos: `apps/backend/src/services/routing-rules.ts`
  - PASS si: create/update compilan la condición y validan que `agentId` ∈ `agent_channels(channel)` del mismo tenant; delete borra solo esa regla; reorder persiste prioridades; list devuelve por `priority asc`; quitar candidato aún referenciado ⇒ error `agent_in_use`.
  - FAIL si: se persiste una regla con agente no candidato o de otro tenant.
  - Properties: P5, P6
  - Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 5.1, 5.2

- [ ] **T6 — Rutas `/api/channels/:id/routing-rules*`**
  - Archivos: `apps/backend/src/routes/routing-rules.ts`, `apps/backend/src/index.ts`
  - PASS si: GET/POST/PATCH/DELETE + PUT order operativos; solo `org:admin` escribe; condición inválida ⇒ 422 `condition`; agente no candidato ⇒ 422 `agent_not_candidate`; acceso cross-tenant rechazado.
  - FAIL si: un admin de otro tenant lee o muta reglas de un canal ajeno.
  - Properties: P6, P8
  - Requirements: 1.3, 1.4, 1.5, 6.4

- [ ] **T7 — Tests de propiedades e integración**
  - Archivos: `apps/backend/test/routing-engine.test.ts`, `apps/backend/test/routing-rules.test.ts`
  - PASS si: property-based (fast-check) cubre P1 (primera por prioridad), P2 (determinismo), P3 (no-match⇒null), P4 (deshabilitadas), P7 (evalCondition no lanza); integración cubre CRUD con aislamiento (P6), 422 por agente no candidato (P5) y `evaluate` end-to-end con auditoría del `ruleId` (P8).
  - FAIL si: algún test no es determinístico o llama a servicios externos.
  - Properties: P1, P2, P3, P4, P5, P6, P7, P8
  - Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 5.1, 6.1, 6.3, 6.4

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T3"] },
    { "id": 2, "tasks": ["T2"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4", "T5"], "depends_on": [2] },
    { "id": 4, "tasks": ["T6"], "depends_on": [3] },
    { "id": 5, "tasks": ["T7"], "depends_on": [4] }
  ]
}
```

## Commits

_(pendiente)_

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — decisión D1 (ruteo híbrido: reglas deterministas + fallback) y Q6 (origen de la etapa del contacto), que fundamentan la parte determinista de esta historia y los campos del DSL.

## Notes

- Depende de US-035 (tabla `agent_channels`, `channels.default_agent_id`, `contacts.stage`) y de E13 (`agents`, `contacts`, `contact_facts`, `extracted_data`). T3/T4/T5 asumen esas tablas ya migradas.
- El fallback en no-match (orquestador US-037, agente por defecto y fijación en `conversations.agent_id` US-038) y la UI (US-039) quedan fuera; `evaluate` devolviendo `null` es el contrato hacia US-038.
- Política de retirada de candidato con reglas vivas (5.2): se asume bloqueo (`agent_in_use`) en T5; confirmar con el humano si se prefiere invalidación en cascada.
- Derivación de `hasPurchased` (Q6): por defecto `facts.has_purchased == "true"` o `stage == "post_sale"`; confirmar la fuente canónica al cerrar US-035.
