---
id: E06
title: Motor conversacional
status: ready
owner: @diego
---

## Objetivo

El corazón del producto: ante un mensaje entrante, el bot construye contexto (identidad E04 + conocimiento/catálogo E05 + memoria E07), genera una respuesta con LLM y la envía por WhatsApp, registrándola en Chatwoot. Incluye el handoff a agente humano.

## Alcance

**Dentro**:
- Pipeline: webhook mensaje → contexto → LLM → respuesta → Chatwoot/Evolution.
- Estados de conversación: `bot | human | paused`, con transferencia explícita.
- Handoff: por solicitud del cliente, por decisión del LLM (no sabe responder) o manual desde Chatwoot/panel.
- Anti-loop y deduplicación de mensajes (idempotencia por message id).

**Fuera**:
- Acciones transaccionales (agendar, cobrar, integraciones de negocio).
- Multi-LLM/routing de modelos.
- Voz y multimedia (solo texto en MVP).

## Criterios de salida

- [ ] Un mensaje de WhatsApp recibe respuesta del bot coherente con identidad y conocimiento en <15s.
- [ ] "Quiero hablar con un humano" transfiere la conversación y el bot deja de responder hasta devolución.
- [ ] Ningún mensaje se responde dos veces (idempotencia demostrada con reintentos del webhook).

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (2)

**Progreso:** 0/2 en producción (0%) · Pendiente desarrollo: 2

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-011](../stories/US-011-pipeline-respuesta/index.md) | Pipeline de respuesta automática | C01 | Pendiente desarrollo | P0 |
| [US-012](../stories/US-012-handoff-humano/index.md) | Handoff bot ↔ agente humano | C01 | Pendiente desarrollo | P1 |

<!-- DASHBOARD:END -->
