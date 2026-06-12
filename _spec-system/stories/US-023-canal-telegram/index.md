---
id: US-023
title: Canal Telegram
epic: E11
cycle: null
status: Levantamiento de requerimientos
priority: P1
estimate: S
owner: @diego
---

# US-023 · Canal Telegram

**Como** admin de tenant, **quiero** conectar un bot de Telegram (bot token) a mi bot de la plataforma, **para** atender clientes por Telegram con el mismo agente.

Conector Telegram sobre la abstracción de US-021: valida el bot token, provisiona el inbox Telegram en Chatwoot y deja el canal operativo de extremo a extremo (mensaje de Telegram → respuesta del bot por Telegram).

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
