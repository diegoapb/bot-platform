---
id: E06-M
variant-of: E06
title: Motor conversacional (alternativa Mastra)
status: draft
owner: @diego
---

> **Alternativa con Mastra** de [E06](../../epics/E06-motor-conversacional.md). No reemplaza la épica original.

## Objetivo

Mismo objetivo que E06: webhook → contexto → LLM → respuesta por WhatsApp registrada en Chatwoot, con handoff a humano. La diferencia: el "motor" deja de ser un pipeline artesanal y pasa a ser un **`Agent` de Mastra orquestado por un workflow durable**.

## Enfoque con Mastra

- **Agente por bot**: una instancia `Agent` cuya configuración es dinámica — `instructions`, `model` y `tools` se resuelven por request desde la identidad del bot (E04) usando `RuntimeContext`. Un solo agente "plantilla" sirve a N bots/tenants.
- **Tools**: retrieval de conocimiento (E05-M), `searchCatalog` (E05-M), y `requestHandoff` (E06-M/US-012-M). El LLM decide cuándo usarlas; el catálogo y el conocimiento ya no se "inyectan", se consultan.
- **Pipeline como workflow**: `createWorkflow` con steps tipados: `validateAndDedupe` → `resolveBotAndState` → `branch(estado)` → `runAgent` → `sendViaEvolution` → `logToChatwoot`. Los steps durables dan retries con backoff y snapshots sin código propio.
- **Idempotencia**: doble capa — dedupe por `messageId` en nuestro Postgres (igual que E06) + workflows reanudables que no re-ejecutan steps completados tras un crash.
- **Memoria**: el agente recibe `memory` (E07-M) con `resource = tenantId:botId:phone` y `thread = conversationId`, así el historial y la memoria del cliente entran solos al contexto.
- **Anti-loop**: guardia en `validateAndDedupe` (ignorar mensajes propios/echo de Evolution) + processors de Mastra (`TokenLimiter`, filtros) como cinturón de seguridad del contexto.

## Alcance

**Dentro**:
- Workflow webhook→respuesta con los steps anteriores, montado en el backend Hono (server adapter de Mastra) o como servidor Mastra aparte.
- Estados `bot | human | paused` persistidos en nuestro Postgres (fuente de verdad fuera de Mastra; el workflow los lee/escribe).
- Handoff por solicitud del cliente, por decisión del LLM (tool `requestHandoff`) o manual desde Chatwoot/panel.
- Dedupe e idempotencia por message id.

**Fuera** (igual que E06):
- Acciones transaccionales, multi-LLM routing (aunque Mastra lo facilita, queda fuera del MVP), voz y multimedia.

## Consideraciones de la capa gratuita

- **Latencia <15s**: en Platform Starter el server es serverless con scale-to-zero ⇒ cold start en cada ráfaga fría. Para cumplir <15s de forma estable, el runtime del motor debería correr en nuestro VPS (variante A) — el servidor persistente 24/7 de Platform cuesta $100/proyecto/mes.
- **CPU hours**: si se usa variante B, cada turno consume CPU time mientras espera al LLM; 24 h/mes ≈ ~5.700 turnos de 15s. Suficiente para piloto, justo para producción.
- **Observabilidad**: cada turno genera varios spans; con 100K eventos/mes hay que filtrar spans (p. ej. solo agente + errores) o exportar a Langfuse self-hosted si se queda corto.
- **Tokens LLM**: BYOK directo al proveedor, sin pasar por el Gateway.

## Criterios de salida (equivalentes a E06)

- [ ] Un mensaje de WhatsApp recibe respuesta coherente con identidad y conocimiento en <15s p95 (medido con el runtime caliente; documentar p95 con cold start si se usa Platform).
- [ ] "Quiero hablar con un humano" dispara `requestHandoff`, transfiere la conversación y el bot no responde hasta devolución.
- [ ] Ningún mensaje se responde dos veces: reintentos del webhook de Evolution no re-ejecutan steps completados (demostrado con test de reintento).

## Historias de esta vertiente

| ID | Título | Equivale a |
| --- | --- | --- |
| [US-011-M](../stories/US-011-pipeline-respuesta.mastra.md) | Workflow de respuesta con Agent de Mastra | US-011 |
| [US-012-M](../stories/US-012-handoff-humano.mastra.md) | Handoff con estados + human-in-the-loop | US-012 |
