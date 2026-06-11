---
id: US-012
title: Handoff bot ↔ agente humano
epic: E06
cycle: C01
status: Pendiente desarrollo
priority: P1
estimate: M
owner: @diego
---

# US-012 · Handoff bot ↔ agente humano

**Como** cliente final, **quiero** poder pedir hablar con una persona, **para** resolver casos que el bot no puede.

Gestiona las transiciones de estado `bot ↔ human ↔ paused`: por solicitud del cliente, por decisión del LLM, o manual desde Chatwoot/panel. Define cómo y cuándo el bot retoma la conversación.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
