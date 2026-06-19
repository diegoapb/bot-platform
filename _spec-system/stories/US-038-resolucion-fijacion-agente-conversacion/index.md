---
id: US-038
title: Resolucion y fijacion del agente al inicio de la conversacion
epic: E14
cycle: null
status: Levantamiento de requerimientos
priority: P1
estimate: L
owner: @diego
---

# US-038 · Resolucion y fijacion del agente al inicio de la conversacion

**Como** plataforma, **quiero** resolver el agente al iniciar la conversacion (reglas -> orquestador -> default) y fijarlo, **para** que el cliente sea atendido por el agente correcto sin cambios en caliente.

Cierra E14 uniendo el motor de reglas (US-036), el orquestador (US-037) y el agente por defecto del canal (US-035) en un unico resolver que decide el agente al crear la conversacion, lo graba en `conversations.agent_id` y registra la causa para auditoria. El agente fijado no cambia a mitad de conversacion (D3); una conversacion nueva tras un cierre se re-resuelve y puede caer en otro agente.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
