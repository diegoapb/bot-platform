---
id: US-039
title: UI de configuracion de ruteo multi-agente
epic: E14
cycle: null
status: Levantamiento de requerimientos
priority: P2
estimate: M
owner: @diego
---

# US-039 · UI de configuracion de ruteo multi-agente

**Como** admin de tenant, **quiero** una UI para asignar agentes a un canal, definir reglas de ruteo y configurar el orquestador y el agente por defecto, **para** administrar el ruteo multi-agente.

E14 introdujo en backend los agentes candidatos del canal, el agente por defecto, el motor de reglas (US-035/036), el orquestador (US-037) y el resolver (US-038), pero sin superficie de administracion. Esta historia construye la pagina de configuracion de ruteo por canal en `apps/frontend`: candidatos y agente por defecto, constructor de reglas ordenables, ajustes del orquestador y un simulador que, dado un contacto de ejemplo, muestra que agente resolveria y por que. No incluye backend (consume los contratos de US-035 a US-038).

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
