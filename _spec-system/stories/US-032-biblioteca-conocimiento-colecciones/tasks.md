---
id: US-032
---

# Tasks — US-032 · Biblioteca de conocimiento reutilizable y enlace a agentes

## Overview

Primero el modelo y la migración de esquema (T1): nuevas tablas `knowledge_collections` y `agent_knowledge_collections`, y reapuntado de `knowledge_sources`/`knowledge_chunks` de `bot_id` a `collection_id`. Luego el servicio de colecciones y enlaces (T2), la reescritura de la ingestión por colección (T3) y de `retrieve()` por agente (T4), los endpoints (T5), la migración de datos idempotente bot→colección (T6), el reapuntado del motor (T7) y las pruebas (T8). La UI es US-034 y queda fuera.

## Tasks

- [x] **T1 — Migración de esquema: `knowledge_collections`, `agent_knowledge_collections` y `collection_id`**
  - Archivos: `apps/backend/drizzle/0008_knowledge_collections.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: se crean `knowledge_collections` y `agent_knowledge_collections` (unique `(agent_id, collection_id)`, FKs cascade a `agents` y `knowledge_collections`); `knowledge_sources` y `knowledge_chunks` ganan `collection_id` (FK cascade) e índice `(collection_id)`; el índice HNSW de `embedding` se conserva.
  - FAIL si: queda `bot_id` como FK obligatoria en sources/chunks, o falta el unique del join, o vector dims ≠ 1536.
  - Properties: P2, P4
  - Requirements: 1.1, 2.1, 2.3, 3.1

- [x] **T2 — `collectionsService`: CRUD + enlace/desenlace + colecciones por agente**
  - Archivos: `apps/backend/src/services/collections.ts`
  - PASS si: create rechaza nombre vacío y devuelve el identificador al crear; update/list/remove aíslan por tenant; remove borra fuentes, chunks y enlaces; linkAgent es idempotente y rechaza cross-tenant; unlinkAgent no borra la colección; `collectionsForAgent` devuelve la unión enlazada.
  - FAIL si: un enlace cruza tenants o un enlace duplicado crea dos filas.
  - Properties: P2, P4, P5, P6
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

- [x] **T3 — `knowledgeService` ingestión por colección (createSource/reindex/deleteSource/listSources)**
  - Archivos: `apps/backend/src/services/knowledge.ts`
  - PASS si: las firmas usan `collectionId` en vez de `botId`; createSource valida colección del mismo tenant; chunks heredan el `collection_id` de su fuente; reindex reemplaza chunks sin huérfanos; delete sin huérfanos.
  - FAIL si: una fuente queda con `collection_id` de otro tenant, o reindex deja chunks previos.
  - Properties: P4
  - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

- [x] **T4 — `retrieve(agentId, query, k)` multi-colección con aislamiento**
  - Archivos: `apps/backend/src/services/knowledge.ts`
  - PASS si: resuelve colecciones enlazadas al agente; busca solo en `collection_id = ANY(linked)` y `tenant_id` del agente; agente sin enlaces → `[]`; umbral aplica; orden descendente y cota k.
  - FAIL si: devuelve un chunk de una colección no enlazada o de otro tenant.
  - Properties: P1, P2, P3, P5
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3

- [x] **T5 — Endpoints de colecciones, fuentes y enlaces**
  - Archivos: `apps/backend/src/routes/collections.ts`, `apps/backend/src/routes/agent-knowledge.ts`, `apps/backend/src/routes/knowledge.ts`, `apps/backend/src/index.ts`
  - PASS si: `POST/GET/PATCH/DELETE /api/collections` y `GET /api/collections/:id/sources`; el POST de creación devuelve el identificador de la colección; carga de fuentes en `POST /api/collections/:id/sources`; `POST/DELETE/GET /api/agents/:agentId/collections`; admin escribe, member lee; 403 cross-tenant; 422 nombre vacío.
  - FAIL si: cualquier acceso cross-tenant tiene éxito.
  - Properties: P2, P6
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5

- [x] **T6 — Migración de datos idempotente bot→colección**
  - Archivos: `apps/backend/src/db/migrate-collections.ts`, `apps/backend/drizzle/0008_knowledge_collections.sql`
  - PASS si: por cada bot con conocimiento se crea 1 colección con sus fuentes y chunks y se enlaza al agente del bot; conteos de fuentes y chunks idénticos pre/post; cero huérfanos; reejecución no duplica colecciones ni enlaces.
  - FAIL si: alguna fuente o chunk queda sin `collection_id`, o se duplican colecciones al reejecutar.
  - Properties: P4, P6
  - Requirements: 6.1, 6.2, 6.3, 6.4, 6.5

- [x] **T7 — Reapuntar el motor a `retrieve(agentId, …)`**
  - Archivos: `apps/backend/src/services/context-builder.ts`
  - PASS si: el contexto invoca `retrieve(agentId, query, MAX_KNOWLEDGE_CHUNKS)` con el agente fijado en la conversación; deja de pasar `bot.id`.
  - FAIL si: el motor sigue recuperando por `botId`.
  - Properties: P1, P5
  - Requirements: 4.1, 5.1

- [ ] **T8 — Tests de colecciones, enlaces, retrieve y migración**
  - Archivos: `apps/backend/test/collections.test.ts`, `apps/backend/test/retrieve-agent.test.ts`, `apps/backend/test/migrate-collections.test.ts`
  - PASS si: ciclo ingest en colección → `retrieve(agentId)` la encuentra; referencia viva (editar C afecta a A y B); desenlace aísla; idempotencia de enlace y migración; aislamiento cross-tenant y cross-colección; embeddings mockeados determinísticos.
  - FAIL si: algún test llama a la API real de embeddings o no es determinístico.
  - Properties: P1, P2, P3, P4, P5, P6
  - Requirements: 3.3, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.3, 6.4, 6.5

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2", "T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4"], "depends_on": [2] },
    { "id": 4, "tasks": ["T5", "T6", "T7"], "depends_on": [3] },
    { "id": 5, "tasks": ["T8"], "depends_on": [4] }
  ]
}
```

## Commits

- 2026-06-18 · E13 implementado (solo implementación; tests pendientes por decisión). Migraciones `0008_milky_magma.sql` (+enum whatsapp_evolution) y `0009_spicy_sharon_carter.sql` (DDL + backfill idempotente + NOT NULL), aplicadas y verificadas en dev. Typecheck monorepo OK.

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — decisión D2 (biblioteca de colecciones reutilizables, enlace N:M, referencia viva), sección 5 (modelo objetivo; en el research las tablas figuran como `knowledgeCollections` y `agentKnowledgeLinks`, que esta historia adopta con los nombres canónicos `knowledge_collections` y `agent_knowledge_collections`, con sources/chunks por `collection_id`), Q2 (granularidad: colección como unidad) y Q5 (aislamiento same-tenant). Fundamentó T1–T6.

## Notes

- Depende de US-031 (entidad `agents` + migración 1:1 bot→agente): T6 presupone que el agente de cada bot ya existe. Si US-031 aún no aplicó su migración, T6 falla por FK a `agents`.
- La normalización del transporte legacy WhatsApp/Evolution como canal es propiedad de US-031; no afecta a esta historia (solo conocimiento).
- La UI de gestión de colecciones y de enlace a agentes vive en US-034; aquí solo contratos, servicios, migración y endpoints.
- Reusa `chunker`, `embeddings` e índice HNSW de US-009 sin cambiar su lógica de ingestión, solo el anclaje (`bot_id` → `collection_id`).
- Supuesto: el agente fijado en la conversación (D3) lo provee US-031/US-035; mientras tanto T7 puede resolver el agente único del bot por compatibilidad.
