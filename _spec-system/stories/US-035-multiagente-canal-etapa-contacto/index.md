---
id: US-035
title: Multiples agentes por canal y etapa del contacto
epic: E14
cycle: null
status: Levantamiento de requerimientos
priority: P1
estimate: M
owner: @diego
---

# US-035 · Multiples agentes por canal y etapa del contacto

**Como** admin de tenant, **quiero** asignar varios agentes a un mismo canal y que cada cliente tenga una etapa, **para** que distintos clientes del mismo canal sean atendidos por distintos agentes.

Es la historia base de la epica E14 (ruteo multi-agente). Habilita el modelo de datos sobre el que despues se montan el motor de reglas (US-036), el orquestador (US-037), la resolucion/fijacion del agente (US-038) y la UI (US-039): relaja la relacion canal-agente a N:M real, anade un agente por defecto por canal y modela la etapa del contacto con persistencia auditable.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
