---
id: US-009
---

# Tasks — US-009 · Gestión e ingestión de conocimiento

## Overview

pgvector y modelo primero (T1), chunker+embeddings (T2), servicio de ingestión (T3) y retrieval (T4), rutas+UI (T5–T6), integración (T7).

## Tasks

- [ ] **T1 — Migración: pgvector + `knowledge_sources` + `knowledge_chunks`**
  - Archivos: `apps/backend/drizzle/000X_knowledge.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: `CREATE EXTENSION vector` aplica en dev y prod; FK cascade source→chunks; índice HNSW creado.
  - FAIL si: vector dims ≠ 1536 o falta índice por bot_id.
  - Properties: P1, P2
  - Requirements: 1.5, 2.4, 3.2

- [ ] **T2 — `chunker` + `embeddings` client**
  - Archivos: `apps/backend/src/services/chunker.ts`, `apps/backend/src/integrations/embeddings.ts`, `apps/backend/src/env.ts`
  - PASS si: chunks ≤ target con solape correcto; batching de embeddings; FAQ = 1 chunk.
  - FAIL si: texto se pierde entre chunks (cobertura < 100% del contenido).
  - Properties: P3
  - Requirements: 2.1

- [ ] **T3 — `knowledgeService`: createSource/delete/reindex + pipeline async**
  - Archivos: `apps/backend/src/services/knowledge.ts`
  - PASS si: estados pending→indexing→ready/failed correctos; reindex reemplaza chunks; delete sin huérfanos; pdf/txt/md extraídos.
  - FAIL si: fuente `ready` con 0 chunks.
  - Properties: P2, P4
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4

- [ ] **T4 — `retrieve()` con umbral y aislamiento**
  - Archivos: `apps/backend/src/services/knowledge.ts`
  - PASS si: solo chunks del bot; orden descendente; umbral aplica; k configurable.
  - FAIL si: query de bot A devuelve chunk de bot B.
  - Properties: P1, P3
  - Requirements: 3.1, 3.2, 3.3

- [ ] **T5 — Rutas `/api/bots/:id/knowledge*`**
  - Archivos: `apps/backend/src/routes/knowledge.ts`, `apps/backend/src/index.ts`
  - PASS si: upload multipart 10MB ok; 422 en formato inválido; search playground devuelve scores; admin escribe, member lee.
  - FAIL si: acceso cross-tenant.
  - Properties: P1
  - Requirements: 1.1, 1.2, 1.3, 4.1, 4.2

- [ ] **T6 — UI `KnowledgeManager` + playground**
  - Archivos: `apps/frontend/src/pages/bots/KnowledgeManager.tsx`
  - PASS si: upload drag&drop, lista con estados auto-refrescada, FAQ form, búsqueda de prueba con scores.
  - FAIL si: estado `failed` sin mensaje de error visible.
  - Properties: P4
  - Requirements: 2.2, 4.1, 4.2

- [ ] **T7 — Tests de ingestión y retrieval**
  - Archivos: `apps/backend/test/knowledge.test.ts`
  - PASS si: ciclo ingest→retrieve, aislamiento entre bots, reindex sin huérfanos; embeddings mockeados determinísticos.
  - FAIL si: tests llaman al API de embeddings real.
  - Properties: P1, P2, P3, P4
  - Requirements: 2.1, 2.4, 3.1, 3.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2"] },
    { "id": 2, "tasks": ["T3", "T4"], "depends_on": [1] },
    { "id": 3, "tasks": ["T5"], "depends_on": [2] },
    { "id": 4, "tasks": ["T6", "T7"], "depends_on": [3] }
  ]
}
```

## Commits

_(SHAs al ejecutar)_

## Research consultada

- _(pendiente: benchmark text-embedding-3-small vs alternativas multilingües para español)_

## Notes

- Postgres de Dokploy debe tener pgvector disponible (imagen `pgvector/pgvector`) — verificar antes de T1.
- Cola externa (BullMQ/Redis) queda fuera del MVP; indexado in-process con `setImmediate`.
