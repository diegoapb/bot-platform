---
id: US-007
title: Sincronización bidireccional de mensajes
epic: E03
cycle: C01
status: Pendiente desarrollo
priority: P0
estimate: L
owner: @diego
---

# US-007 · Sincronización bidireccional de mensajes

**Como** agente de tenant, **quiero** ver los WhatsApp de los clientes como conversaciones en Chatwoot y responder desde ahí, **para** atender todo en un solo inbox.

Conecta los dos webhooks: Evolution → Chatwoot (mensaje entrante crea/actualiza contacto y conversación) y Chatwoot → Evolution (respuesta del agente sale por WhatsApp). Incluye mapeo persistente y deduplicación.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
