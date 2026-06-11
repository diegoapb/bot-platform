---
id: US-009
title: Gestión e ingestión de conocimiento
epic: E05
cycle: C01
status: Pendiente desarrollo
priority: P1
estimate: L
owner: @diego
---

# US-009 · Gestión e ingestión de conocimiento

**Como** admin de tenant, **quiero** cargar documentos, FAQs y notas a la base de conocimiento de mi bot, **para** que responda con información real de mi negocio.

Ingestión → chunking → embeddings → índice pgvector, con búsqueda semántica interna `retrieve()` que consume el motor (US-011). Aislamiento estricto por tenant/bot.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
