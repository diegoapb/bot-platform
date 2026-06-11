---
id: E03
title: Integración Chatwoot
status: ready
owner: @diego
---

## Objetivo

Centralizar la atención en Chatwoot: cada tenant obtiene su cuenta/inbox y todo mensaje de WhatsApp (vía Evolution) se refleja como conversación en Chatwoot, con respuesta de agentes humanos de vuelta al cliente.

## Alcance

**Dentro**:
- Provisión automática de cuenta + inbox API de Chatwoot por tenant/bot.
- Alta de agentes del tenant en su cuenta de Chatwoot.
- Sincronización bidireccional: mensaje entrante Evolution → conversación Chatwoot; respuesta en Chatwoot → WhatsApp del cliente.
- Mapeo persistente contacto/conversación entre ambos sistemas.

**Fuera**:
- Respuesta automática del bot (E06) — aquí solo humanos.
- Canales distintos de WhatsApp.
- Reportes/SLAs de Chatwoot.

## Criterios de salida

- [ ] Al activar un bot, el tenant tiene inbox propio en Chatwoot sin pasos manuales.
- [ ] Un mensaje de WhatsApp aparece en Chatwoot en <5s con el contacto correcto.
- [ ] La respuesta del agente en Chatwoot llega al WhatsApp del cliente y queda registrada una sola vez (sin ecos/duplicados).

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (2)

**Progreso:** 0/2 en producción (0%) · Pendiente desarrollo: 2

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-006](../stories/US-006-provision-chatwoot-tenant/index.md) | Provisión de cuenta e inbox Chatwoot por tenant | C01 | Pendiente desarrollo | P0 |
| [US-007](../stories/US-007-sync-mensajes-evolution-chatwoot/index.md) | Sincronización bidireccional de mensajes | C01 | Pendiente desarrollo | P0 |

<!-- DASHBOARD:END -->
