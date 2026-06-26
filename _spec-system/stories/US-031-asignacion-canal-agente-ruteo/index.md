---
id: US-031
title: Asignación N:M canal-agente y ruteo de inbound por agente
epic: E13
cycle: null
status: Pendiente de pruebas
priority: P0
estimate: L
owner: @diego
---

# US-031 · Asignación N:M canal-agente y ruteo de inbound por agente

**Como** admin de tenant, **quiero** asignar uno o varios canales a un agente, **para** que un mismo agente atienda WhatsApp, Instagram y Telegram a la vez con un único cerebro.

Tras la migración de `bot` a `agent` (US-030), esta historia introduce la tabla join `agent_channels` (N:M) y reescribe el ruteo de inbound para que el webhook resuelva el **agente** por su **canal** en vez de operar sobre `botId`. En esta fase (E13) un canal se enlaza a **exactamente un** agente (la estructura N:M queda lista para los varios-agentes-por-canal y reglas de ruteo de E14). El agente resuelto se **fija** en `conversations.agent_id` al crear la conversación, sentando la fundación de la decisión D3.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
