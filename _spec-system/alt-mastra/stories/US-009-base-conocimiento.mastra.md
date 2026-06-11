---
id: US-009-M
variant-of: US-009
title: Ingestión de conocimiento con RAG de Mastra
epic: E05-M
status: draft
priority: P1
estimate: M  # baja de L→M: chunking/embeddings/retrieval los da el framework
owner: @diego
---

# US-009-M · Ingestión de conocimiento con RAG de Mastra

**Como** admin de tenant, **quiero** cargar documentos, FAQs y notas a la base de conocimiento de mi bot, **para** que responda con información real de mi negocio.

> Equivale a [US-009](../../stories/US-009-base-conocimiento/index.md). Misma historia de usuario y mismos criterios; cambia el **cómo**.

## Qué cambia respecto al original

| Original (artesanal) | Con Mastra |
| --- | --- |
| Chunking propio | `MDocument.fromMarkdown/fromText().chunk({ strategy, size, overlap })` |
| Llamadas de embeddings a mano | `embedMany()` con model routing (BYOK) |
| Tablas + queries pgvector propias | `PgVector` de `@mastra/pg` sobre el mismo Postgres |
| `retrieve(query, botId)` como función interna | `createVectorQueryTool()` con metadata filters — ya es una tool de agente |
| Aislamiento por columna tenant/bot + WHERE | Aislamiento por metadata `{ tenantId, botId }` forzada desde `RuntimeContext` |

## Diseño (resumen)

1. **Endpoint de ingestión** (backend Hono, auth Clerk igual que el original): recibe texto/markdown/txt/pdf o FAQ estructurada. PDF → texto con el extractor ya previsto.
2. **Job de indexado**: `MDocument` → `.chunk()` → `embedMany()` → `pgVector.upsert(index, vectors, metadata)`. Metadata mínima: `tenantId`, `botId`, `sourceId`, `sourceType`, `title`, `chunkIndex`.
3. **Tool de retrieval**: `createVectorQueryTool({ vectorStore, index, model })`; el filtro `{ tenantId, botId }` se construye en server-side desde RuntimeContext — el LLM solo aporta la query.
4. **Gestión**: listar/eliminar fuentes = borrar por `sourceId` en el índice + registro en tabla `knowledge_sources` (Drizzle) para la UI.
5. **Re-indexado**: editar una fuente = delete por `sourceId` + re-ingestión (idéntico al original).

## Free tier

- Vectores en Postgres propio: sin límites de Platform.
- Ingestión corre en nuestro backend (variante A) para no gastar CPU hours.
- Costo embeddings: BYOK (≈1 llamada `embedMany` por documento).

## Criterios de aceptación

- [ ] Documento subido es recuperable por la tool de retrieval en <1 min.
- [ ] Test de aislamiento: query de bot A jamás devuelve chunks de bot B (mismo tenant) ni de otro tenant.
- [ ] Eliminar una fuente la saca del índice (deja de aparecer en resultados).
- [ ] FAQs estructuradas se indexan como chunks Q+A individuales.
