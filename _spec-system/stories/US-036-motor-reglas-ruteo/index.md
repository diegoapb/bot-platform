---
id: US-036
title: Motor de reglas de ruteo declarativas
epic: E14
cycle: null
status: Levantamiento de requerimientos
priority: P1
estimate: L
owner: @diego
---

# US-036 · Motor de reglas de ruteo declarativas

**Como** admin de tenant, **quiero** definir reglas que mapeen condiciones del cliente a un agente, **para** enrutar de forma determinista y auditable dentro de un canal.

Materializa la parte determinista del ruteo híbrido (decisión D1 del research del 2026-06-18). Sobre el cimiento de datos de US-035 (`agent_channels`, `channels.default_agent_id`, `contacts.stage`) añade la tabla `routing_rules` y una función pura `evaluate(channel, contact)` que evalúa las reglas habilitadas por prioridad ascendente y devuelve el agente de la primera que matchea, o `null` si ninguna aplica. El fallback al orquestador (US-037) y la integración en la conversación (US-038) quedan fuera.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
