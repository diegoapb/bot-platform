---
id: US-027
title: Esquema de extracción configurable por bot
epic: E12
cycle: null
status: Pendiente de pruebas
priority: P1
estimate: S
owner: @diego
---

# US-027 · Esquema de extracción configurable por bot

**Como** admin de tenant, **quiero** definir qué información estructurada debe capturar mi bot (campos, tipos y descripciones) mediante un JSON Schema por bot, **para** que la extracción se adapte a mi negocio.

Modelo y API para el esquema de extracción: validación del JSON Schema al guardarlo, versionado simple y esquema de ejemplo por defecto. Es el contrato que consumen US-028 (extracción) y US-029 (visualización/edición).

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
