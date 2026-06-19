---
id: US-034
title: UI de gestion de agentes
epic: E13
cycle: null
status: Levantamiento de requerimientos
priority: P1
estimate: M
owner: @diego
---

# US-034 · UI de gestion de agentes

**Como** admin de tenant, **quiero** una UI para crear y editar agentes, asignarles canales y enlazar colecciones de conocimiento, **para** administrar el nuevo modelo desacoplado (agente / canal / conocimiento).

E13 introduce el agente como entidad propia (US-030), los canales N:M (US-031) y la biblioteca de colecciones de conocimiento (US-032). Esta historia entrega la capa de gestion en `apps/frontend`: lista y detalle de agentes, edicion de identidad versionada y modelo, asignacion de canales, enlace de colecciones y visualizacion del conocimiento efectivo, respetando permisos admin/member y sin exponer credenciales de canal. Queda **fuera** la UI de reglas de ruteo y orquestador (E14/US-039) y el backend de agentes/canales/colecciones (US-030/031/032), que esta historia solo consume.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
