---
id: US-012-M
variant-of: US-012
title: Handoff con estados + human-in-the-loop
epic: E06-M
status: draft
priority: P1
estimate: M
owner: @diego
---

# US-012-M · Handoff bot ↔ agente humano (alternativa Mastra)

**Como** cliente final, **quiero** poder pedir hablar con una persona, **para** resolver casos que el bot no puede.

> Equivale a [US-012](../../stories/US-012-handoff-humano/index.md). Las transiciones `bot ↔ human ↔ paused` se mantienen idénticas; cambia cómo el LLM dispara el handoff y cómo se integra en el workflow.

## Qué cambia respecto al original

| Original | Con Mastra |
| --- | --- |
| Detección de "no sé responder" por heurística/parseo de la salida del LLM | Tool explícita `requestHandoff({ reason })`: el LLM la invoca, decisión auditable en la traza |
| Estado de conversación gestionado por el pipeline | Igual: tabla propia en Postgres como **fuente de verdad** (no se delega a Mastra); el workflow la consulta en `resolveBotAndState` |
| Lógica de pausa/reanudación dispersa | Branching del workflow + (opcional post-MVP) `suspend/resume` para flujos de aprobación |

**Decisión deliberada**: el estado `bot|human|paused` NO se modela como workflow suspendido de Mastra. Una conversación puede estar en `human` durante días; mantenerla como run suspendido acopla el dominio al framework y complica el panel. Tabla `conversation_state` propia + transiciones explícitas, igual que el original.

## Diseño (resumen)

1. **Tool `requestHandoff`** (en el agente de US-011-M): marca `conversation_state = human`, etiqueta la conversación en Chatwoot (label/asignación a equipo humano) y devuelve al agente la instrucción de despedirse ("te comunico con una persona").
2. **Triggers de handoff** (los 3 del original):
   - Cliente lo pide → el LLM invoca `requestHandoff` (se refuerza en las instructions de identidad).
   - LLM no sabe responder → mismas instructions: "si no encuentras respuesta en tus tools, usa requestHandoff".
   - Manual → endpoint del panel + webhook de Chatwoot (cambio de asignación) escriben `conversation_state`.
3. **Devolución al bot**: acción en panel/Chatwoot → `conversation_state = bot`; el siguiente mensaje entra de nuevo por `runAgent`.
4. **Comportamiento en `human|paused`**: ya resuelto en `resolveBotAndState` (US-011-M): registrar en Chatwoot, no responder.
5. **Auditoría**: cada transición se registra (quién, cuándo, motivo); la invocación de la tool queda en la traza de Mastra.

## Free tier

- Sin impacto directo. Las trazas de handoff son de los spans que SÍ conviene exportar a Platform (bajo volumen, alto valor de debugging).

## Criterios de aceptación

- [ ] "Quiero hablar con un humano" → tool invocada, estado `human`, conversación asignada/etiquetada en Chatwoot, bot deja de responder.
- [ ] Pregunta sin cobertura en conocimiento/catálogo → el bot ofrece handoff en lugar de inventar.
- [ ] Transferencia manual desde Chatwoot o panel silencia al bot de inmediato.
- [ ] Devolución al bot reactiva respuestas automáticas en el siguiente mensaje.
- [ ] Toda transición queda auditada con origen (cliente/LLM/manual) y timestamp.
