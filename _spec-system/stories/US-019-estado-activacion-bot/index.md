---
id: US-019
title: Estado de activación global del bot
epic: E10
cycle: null
status: Pendiente de pruebas
priority: P0
estimate: S
owner: @diego
---

# US-019 · Estado de activación global del bot

**Como** admin de tenant, **quiero** que mi bot tenga un estado global activo/inactivo que el motor respete de inmediato, **para** apagar las respuestas automáticas sin perder mensajes ni configuración.

Agrega el estado de activación al modelo del bot, lo expone por API y lo hace cumplir en el pipeline: con el bot inactivo no se genera ninguna respuesta automática, pero los mensajes entrantes siguen sincronizándose a Chatwoot. Incluye auditoría de quién cambió el estado y cuándo.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
