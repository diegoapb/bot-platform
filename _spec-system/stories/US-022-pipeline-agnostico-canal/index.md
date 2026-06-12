---
id: US-022
title: Pipeline de respuesta agnóstico de canal vía Chatwoot
epic: E11
cycle: null
status: Levantamiento de requerimientos
priority: P0
estimate: L
owner: @diego
---

# US-022 · Pipeline de respuesta agnóstico de canal vía Chatwoot

**Como** plataforma, **quiero** que el motor conversacional reciba y responda mensajes a través de los webhooks y la API de Chatwoot, **para** que atender un canal nuevo no requiera cambios en el motor.

Desacopla el pipeline (E06) del transporte: la entrada llega por webhook de Chatwoot identificando bot/canal por inbox, y la respuesta sale por la API de Chatwoot, que la entrega al canal correspondiente. Cubre deduplicación de ecos y convivencia con el flujo Evolution existente.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
