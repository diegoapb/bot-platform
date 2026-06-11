---
id: US-011
title: Pipeline de respuesta automática
epic: E06
cycle: C01
status: Pendiente de pruebas
priority: P0
estimate: XL
owner: @diego
---

# US-011 · Pipeline de respuesta automática

**Como** cliente final, **quiero** recibir respuestas útiles e inmediatas del bot por WhatsApp, **para** resolver mis dudas sin esperar a un humano.

El corazón del MVP: mensaje entrante → contexto (identidad US-008 + conocimiento US-009 + catálogo US-010 + memoria US-013) → LLM → respuesta por Evolution, registrada en Chatwoot. Idempotente y consciente del estado de la conversación.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
