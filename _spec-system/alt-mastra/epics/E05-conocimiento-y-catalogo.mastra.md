---
id: E05-M
variant-of: E05
title: Base de conocimiento y catálogo (alternativa Mastra)
status: draft
owner: @diego
---

> **Alternativa con Mastra** de [E05](../../epics/E05-conocimiento-y-catalogo.md). No reemplaza la épica original.

## Objetivo

Mismo objetivo que E05: darle al agente el "qué sabe". La diferencia es que el pipeline de RAG (chunking, embeddings, índice y retrieval) no se implementa a mano: se usan las primitivas de RAG de Mastra sobre nuestro propio Postgres/pgvector.

## Enfoque con Mastra

- **Ingestión**: `MDocument.fromText() / fromMarkdown()` + `.chunk()` (estrategias `recursive`/`markdown`, tamaño y overlap configurables). PDF se extrae a texto antes (igual que en la épica original).
- **Embeddings**: `embed()`/`embedMany()` con el proveedor elegido vía model routing (BYOK, sin recargo del Gateway).
- **Índice vectorial**: `PgVector` (`@mastra/pg`) apuntando al Postgres de Dokploy. Un índice por entorno; aislamiento por **metadata** `{ tenantId, botId, sourceId }` en cada chunk.
- **Retrieval**: `createVectorQueryTool()` con **metadata filters** fijados por `RuntimeContext` (el tenant/bot llega del request, nunca del LLM). Esto reemplaza al `retrieve(query, botId)` artesanal y queda expuesto directamente como tool del agente de E06-M.
- **Catálogo**: sigue siendo CRUD en Drizzle (Mastra no aporta nada para CRUD). Se expone al agente como tool tipada con `createTool()` + Zod (`searchCatalog({ name?, available? })`).

## Alcance

**Dentro**:
- Ingestión de texto pegado, markdown/txt/pdf y FAQs con las primitivas `MDocument`/`embedMany`.
- Índice `PgVector` scopeado por tenant/bot vía metadata filters.
- Tool de retrieval (`createVectorQueryTool`) consumible por el agente (E06-M) y por un endpoint interno de prueba.
- CRUD de catálogo (idéntico a E05) + tool `searchCatalog` para el agente.

**Fuera** (igual que E05):
- Scraping, sincronización con e-commerce, imágenes/audio, curación automática.
- **Retrieval storage del Memory Gateway**: descartado explícitamente (límite de 250 MB en free; nuestro pgvector no tiene ese techo).

## Consideraciones de la capa gratuita

- Vectores y documentos viven en **nuestro** Postgres → ningún límite de Platform aplica al volumen de conocimiento.
- El costo de embeddings es de nuestra API key (BYOK); estimar ~1 embedding por chunk + 1 por query.
- Si la ingestión corre en Platform serverless (variante B), trabajos grandes de embeddings consumen CPU hours (24 h/mes): preferir ingestión en nuestro backend (variante A).

## Criterios de salida (equivalentes a E05)

- [ ] Un admin sube un documento y en <1 min es recuperable vía la tool de retrieval.
- [ ] La tool de retrieval devuelve solo chunks del bot consultado: el filtro `{ tenantId, botId }` viene del RuntimeContext y se verifica con test de aislamiento cruzado.
- [ ] El catálogo es consultable por el agente vía `searchCatalog` con filtros básicos (nombre, disponibilidad).

## Historias de esta vertiente

| ID | Título | Equivale a |
| --- | --- | --- |
| [US-009-M](../stories/US-009-base-conocimiento.mastra.md) | Ingestión de conocimiento con RAG de Mastra | US-009 |
| [US-010-M](../stories/US-010-catalogo-productos.mastra.md) | Catálogo como tool del agente | US-010 |
