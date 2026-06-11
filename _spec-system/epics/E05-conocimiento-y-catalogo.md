---
id: E05
title: Base de conocimiento y catálogo
status: ready
owner: @diego
---

## Objetivo

Darle al agente el "qué sabe": una base de conocimiento por bot (documentos, FAQs, notas) con búsqueda semántica, y un catálogo estructurado de productos/servicios sobre los que da soporte e información.

## Alcance

**Dentro**:
- Ingestión de conocimiento: texto pegado, archivos markdown/txt/pdf y FAQs estructuradas.
- Chunking + embeddings + índice vectorial (pgvector) scopeado por tenant/bot.
- Búsqueda semántica interna (`retrieve(query, botId)`) para el motor (E06).
- CRUD de catálogo: producto/servicio con nombre, descripción, precio, disponibilidad y metadatos.

**Fuera**:
- Scraping de sitios web y sincronización con e-commerce externos.
- Imágenes/audio en el conocimiento.
- Curación automática de calidad del contenido.

## Criterios de salida

- [ ] Un admin sube un documento y en <1 min es recuperable por búsqueda semántica.
- [ ] `retrieve()` devuelve solo chunks del bot consultado (aislamiento por tenant verificado).
- [ ] El catálogo es consultable por el motor con filtros básicos (nombre, disponibilidad).

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (2)

**Progreso:** 0/2 en producción (0%) · Pendiente desarrollo: 2

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-009](../stories/US-009-base-conocimiento/index.md) | Gestión e ingestión de conocimiento | C01 | Pendiente desarrollo | P1 |
| [US-010](../stories/US-010-catalogo-productos/index.md) | Catálogo de productos y servicios | C01 | Pendiente desarrollo | P1 |

<!-- DASHBOARD:END -->
