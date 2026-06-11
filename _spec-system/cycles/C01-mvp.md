---
id: C01
name: MVP
start: 2026-06-10
end: 2026-07-31
goal: Entregar el MVP — bot de WhatsApp con identidad, conocimiento y memoria, operando sobre Chatwoot + Evolution API.
---

## Objetivo

Demostrar el flujo completo de valor: un tenant conecta su número de WhatsApp, define la identidad de su agente, carga conocimiento y catálogo, y el bot responde conversaciones reales con memoria por cliente y handoff a humano vía Chatwoot.

## Riesgos

- Baneos de WhatsApp por uso de Baileys (Evolution API) — mitigar con warm-up de números y límites de envío.
- Acoplamiento al API de Chatwoot (versionado) — fijar versión y aislar en `integrations/chatwoot.ts`.
- Costo/latencia de LLM en el pipeline de respuesta — cache de contexto y modelo económico por defecto.
- Alcance amplio (7 épicas) — el orden de las waves del ciclo es estricto: canales → conocimiento → motor → operación.

## Retrospectiva (al cerrar)

- Qué funcionó:
- Qué no:
- Acciones:

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias inscritas (10)

**Progreso:** 0/10 en producción (0%) · Pendiente desarrollo: 5 · Pendiente de pruebas: 5

| ID | Título | Épica | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-005](../stories/US-005-conexion-whatsapp-evolution/index.md) | Registro y vinculación de número WhatsApp | E02 | Pendiente desarrollo | P0 |
| [US-006](../stories/US-006-provision-chatwoot-tenant/index.md) | Provisión de cuenta e inbox Chatwoot por tenant | E03 | Pendiente desarrollo | P0 |
| [US-007](../stories/US-007-sync-mensajes-evolution-chatwoot/index.md) | Sincronización bidireccional de mensajes | E03 | Pendiente desarrollo | P0 |
| [US-008](../stories/US-008-identidad-agente/index.md) | Gestión de identidad del agente | E04 | Pendiente desarrollo | P1 |
| [US-009](../stories/US-009-base-conocimiento/index.md) | Gestión e ingestión de conocimiento | E05 | Pendiente de pruebas | P1 |
| [US-010](../stories/US-010-catalogo-productos/index.md) | Catálogo de productos y servicios | E05 | Pendiente de pruebas | P1 |
| [US-011](../stories/US-011-pipeline-respuesta/index.md) | Pipeline de respuesta automática | E06 | Pendiente de pruebas | P0 |
| [US-012](../stories/US-012-handoff-humano/index.md) | Handoff bot ↔ agente humano | E06 | Pendiente de pruebas | P1 |
| [US-013](../stories/US-013-memoria-cliente/index.md) | Memoria persistente por cliente | E07 | Pendiente de pruebas | P1 |
| [US-014](../stories/US-014-panel-operacion/index.md) | Panel de operación y despliegue MVP | E08 | Pendiente desarrollo | P1 |

<!-- DASHBOARD:END -->
