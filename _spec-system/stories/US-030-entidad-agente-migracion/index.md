---
id: US-030
title: Entidad Agente y migracion bot->agente
epic: E13
cycle: null
status: Pendiente de pruebas
priority: P0
estimate: L
owner: @diego
---

# US-030 · Entidad Agente y migracion bot->agente

**Como** plataforma, **quiero** una entidad Agente propia (identidad, modelo, configuracion del "cerebro") separada del transporte, **para** que un agente exista de forma independiente del canal y del conocimiento.

Es la historia fundacional de la epica E13 (desacople agente/canal/conocimiento). Introduce la tabla `agents`, migra cada `bot` existente a exactamente un agente de forma idempotente, re-apunta la identidad (`identity_documents`) al agente y permite elegir el modelo LLM efectivo por agente (con `NULL` = modelo global). El transporte legacy sigue colgando del bot por ahora; canales, colecciones y contacto unificado se desacoplan en US-031..US-033.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
