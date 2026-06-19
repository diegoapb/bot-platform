---
id: US-032
title: Biblioteca de conocimiento reutilizable y enlace a agentes
epic: E13
cycle: null
status: Levantamiento de requerimientos
priority: P0
estimate: L
owner: @diego
---

# US-032 · Biblioteca de conocimiento reutilizable y enlace a agentes

**Como** admin de tenant, **quiero** organizar el conocimiento en colecciones reutilizables y enlazarlas a uno o varios agentes, **para** compartir y heredar conocimiento entre agentes sin duplicarlo.

Hoy el conocimiento cuelga directamente del bot (`knowledge_sources.bot_id` / `knowledge_chunks.bot_id`) y no se puede reutilizar. Esta historia introduce la **colección** como unidad reutilizable (`knowledge_collections`), un enlace N:M agente↔colección (`agent_knowledge_collections`) y reescribe `retrieve()` para que opere por agente sobre las colecciones que enlaza, con referencia **viva** (un cambio en una colección se propaga a todos los agentes que la enlazan) y aislamiento estricto por tenant. La UI de gestión vive en US-034; aquí solo contratos, servicios, migración y endpoints.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
