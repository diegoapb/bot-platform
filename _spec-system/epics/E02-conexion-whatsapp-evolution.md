---
id: E02
title: Conexión WhatsApp vía Evolution API
status: ready
owner: @diego
---

## Objetivo

Que un admin de tenant pueda conectar su propio número de WhatsApp a un bot: crear la instancia en Evolution API, vincularla escaneando un QR y ver en todo momento el estado de la conexión. Es la puerta de entrada de todos los mensajes del MVP.

## Alcance

**Dentro**:
- Creación/eliminación de instancias de Evolution API por bot (1 bot = 1 instancia).
- Flujo de vinculación por QR desde el dashboard, con refresco automático.
- Persistencia y visualización del estado de conexión (`disconnected | qr | connected`).
- Webhook base de Evolution → backend (recepción de eventos de conexión y mensajes).

**Fuera**:
- Sincronización con Chatwoot (E03).
- Respuesta automática del bot (E06).
- Múltiples números por bot.

## Criterios de salida

- [ ] Un `org:admin` crea un bot, escanea el QR y el estado pasa a `connected` sin tocar Evolution directamente.
- [ ] Si el teléfono se desvincula, el dashboard refleja el estado en <30s y permite re-vincular.
- [ ] Los eventos del webhook quedan persistidos y scopeados por `tenantId`.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (1)

**Progreso:** 0/1 en producción (0%) · Pendiente desarrollo: 1

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-005](../stories/US-005-conexion-whatsapp-evolution/index.md) | Registro y vinculación de número WhatsApp | C01 | Pendiente desarrollo | P0 |

<!-- DASHBOARD:END -->
