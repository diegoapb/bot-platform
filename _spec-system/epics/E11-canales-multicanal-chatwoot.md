---
id: E11
title: Multicanal vía Chatwoot
status: in-progress
owner: @diego
---

## Objetivo

Que un bot atienda clientes por múltiples canales (WhatsApp vía Baileys/Evolution, WhatsApp Cloud API, Telegram, Instagram DM, Facebook Messenger) usando Chatwoot como capa unificadora: cada canal es un inbox de Chatwoot y el motor conversacional responde de forma agnóstica al canal.

## Alcance

**Dentro**:
- Abstracción de canal: entidad `Channel` por bot (tipo, credenciales, estado de conexión, inbox de Chatwoot asociado).
- Pipeline de entrada/salida agnóstico de canal a través de webhooks y API de Chatwoot (el motor no conoce el transporte).
- Conectores de canal: Telegram (bot token), WhatsApp Cloud API (Meta), Instagram DM y Facebook Messenger (Meta).
- UI de gestión de canales: conectar, desconectar y ver estado de cada canal por bot.
- Convivencia con el canal WhatsApp existente vía Evolution (E02/E03) bajo la misma abstracción.

**Fuera**:
- Canales no soportados nativamente por Chatwoot (SMS, email, web widget) — se evalúan después.
- Migración de conversaciones históricas entre canales.
- Identidad unificada de un mismo cliente entre canales distintos (cross-channel identity).
- Respuestas con formato específico por canal más allá de texto y multimedia básica.

## Criterios de salida

- [ ] Un tenant conecta Telegram desde el dashboard y un mensaje de Telegram recibe respuesta del bot por Telegram, sin tocar configuración externa.
- [ ] Un mismo bot atiende simultáneamente al menos dos canales distintos, con las conversaciones separadas por inbox en Chatwoot.
- [ ] Agregar un tipo de canal nuevo no requiere cambios en el motor conversacional (solo un conector + provisión de inbox).

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (6)

**Progreso:** 0/6 en producción (0%) · Pendiente de pruebas: 6

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-021](../stories/US-021-abstraccion-canales/index.md) | Abstracción de canal y provisión de inbox por canal | — | Pendiente de pruebas | P0 |
| [US-022](../stories/US-022-pipeline-agnostico-canal/index.md) | Pipeline de respuesta agnóstico de canal vía Chatwoot | — | Pendiente de pruebas | P0 |
| [US-023](../stories/US-023-canal-telegram/index.md) | Canal Telegram | — | Pendiente de pruebas | P1 |
| [US-024](../stories/US-024-canal-whatsapp-cloud-api/index.md) | Canal WhatsApp Cloud API (oficial) | — | Pendiente de pruebas | P1 |
| [US-025](../stories/US-025-canales-meta-instagram-messenger/index.md) | Canales Meta — Instagram DM y Facebook Messenger | — | Pendiente de pruebas | P2 |
| [US-026](../stories/US-026-ui-gestion-canales/index.md) | UI de gestión de canales del bot | — | Pendiente de pruebas | P1 |

<!-- DASHBOARD:END -->
