---
id: E10
title: Activación y ciclo de vida del bot
status: draft
owner: @diego
---

## Objetivo

Que el admin del tenant pueda activar o desactivar su bot de forma global con un solo control: un bot desactivado deja de responder automáticamente en todos sus canales de inmediato, sin perder mensajes ni configuración, y puede reactivarse igual de rápido.

## Alcance

**Dentro**:
- Estado de activación global por bot (`active | inactive`) persistido y consultable.
- Enforcement en el motor conversacional: bot inactivo no genera respuestas automáticas; los mensajes entrantes siguen sincronizándose a Chatwoot para atención humana.
- UI en el dashboard: toggle de activación con estado visible, confirmación y feedback inmediato.
- Auditoría mínima: quién activó/desactivó y cuándo.

**Fuera**:
- Pausa por conversación individual (eso es E08).
- Desconexión de canales/instancias (el bot inactivo mantiene sus conexiones; desconectar canales es E11).
- Programación de horarios de actividad (business hours).
- Borrado o archivado del bot.

## Criterios de salida

- [ ] Al desactivar un bot, el motor deja de responder en todos los canales en la siguiente interacción, sin reiniciar servicios.
- [ ] Con el bot desactivado, los mensajes entrantes siguen llegando a Chatwoot y los agentes humanos pueden responder con normalidad.
- [ ] Al reactivar, el bot retoma respuestas automáticas conservando memoria, conocimiento e identidad sin pasos adicionales.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (2)

**Progreso:** 0/2 en producción (0%) · Levantamiento de requerimientos: 2

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-019](../stories/US-019-estado-activacion-bot/index.md) | Estado de activación global del bot | — | Levantamiento de requerimientos | P0 |
| [US-020](../stories/US-020-ui-toggle-activacion-bot/index.md) | Toggle de activación del bot en el dashboard | — | Levantamiento de requerimientos | P0 |

<!-- DASHBOARD:END -->
