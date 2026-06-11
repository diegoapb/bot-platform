---
id: US-006
title: Provisión de cuenta e inbox Chatwoot por tenant
epic: E03
cycle: C01
status: Pendiente desarrollo
priority: P0
estimate: M
owner: @diego
---

# US-006 · Provisión de cuenta e inbox Chatwoot por tenant

**Como** admin de tenant, **quiero** que al activar mi bot se cree automáticamente mi espacio de atención en Chatwoot, **para** que mi equipo atienda conversaciones sin configurar nada externo.

Crea por API la cuenta de Chatwoot del tenant, el inbox API del bot y el alta de agentes. Deja el mapeo persistido (`chatwootAccountId`, `chatwootInboxId`) que US-007 necesita para sincronizar mensajes.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
