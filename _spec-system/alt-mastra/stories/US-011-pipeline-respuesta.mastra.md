---
id: US-011-M
variant-of: US-011
title: Workflow de respuesta con Agent de Mastra
epic: E06-M
status: draft
priority: P0
estimate: L  # baja de XL→L: retries, durabilidad, contexto y memoria los da el framework
owner: @diego
---

# US-011-M · Workflow de respuesta con Agent de Mastra

**Como** cliente final, **quiero** recibir respuestas útiles e inmediatas del bot por WhatsApp, **para** resolver mis dudas sin esperar a un humano.

> Equivale a [US-011](../../stories/US-011-pipeline-respuesta/index.md). Mismo criterio de negocio; el pipeline artesanal se sustituye por `Agent` + workflow durable.

## Qué cambia respecto al original

| Original | Con Mastra |
| --- | --- |
| Pipeline: armar contexto (identidad + conocimiento + catálogo + memoria) → prompt → LLM | `Agent` con `instructions` dinámicas (identidad US-008) y tools (retrieval, catálogo, handoff); memoria inyectada por `Memory` |
| Retries/colas propias | Steps durables de workflow con retry + snapshot |
| Historial de conversación gestionado a mano | Threads de Memory (`thread = conversationId`) |
| Construcción manual de prompt con contexto fijo | El agente trae el contexto bajo demanda vía tools (menos tokens/turno) |

## Diseño (resumen)

1. **Agente plantilla** (uno para todos los bots):
   ```ts
   const supportAgent = new Agent({
     id: "support-agent",
     instructions: ({ runtimeContext }) => buildIdentityPrompt(runtimeContext.get("bot")), // US-008
     model: ({ runtimeContext }) => runtimeContext.get("bot").model, // BYOK
     tools: { knowledgeSearch, searchCatalog, requestHandoff },
     memory, // US-013-M
   });
   ```
2. **Workflow `replyWorkflow`** (steps):
   - `validateAndDedupe`: verifica firma del webhook de Evolution, descarta echo/propios, dedupe por `messageId` (unique en Postgres) → si duplicado, termina.
   - `resolveBotAndState`: carga bot/tenant por instancia de Evolution; lee estado de conversación. Si `human|paused` → solo registra en Chatwoot y termina (no responde).
   - `runAgent`: `agent.generate(text, { memory: { resource, thread }, runtimeContext })`.
   - `sendViaEvolution`: envía respuesta; retry con backoff (step durable).
   - `logToChatwoot`: registra entrante y saliente como en el original.
3. **Trigger**: endpoint Hono del webhook → `replyWorkflow.createRun().start()`. El webhook responde 200 inmediato; el workflow corre async.
4. **Idempotencia**: (a) unique constraint por messageId, (b) steps completados no se re-ejecutan en reintento/crash.
5. **Guardas de contexto**: `TokenLimiter` y límite de longitud de respuesta para WhatsApp.

## Free tier

- Runtime en nuestro VPS (variante A) ⇒ sin cold starts, criterio <15s alcanzable; CPU hours de Platform sin consumir.
- Tracing al Platform Starter con **span filtering** (solo span raíz del agente + errores) para caber en 100K eventos/mes.
- Si se opta por variante B (server en Platform): presupuestar cold start (~segundos) dentro de los 15s y monitorear el consumo de 24 h CPU/mes.

## Criterios de aceptación

- [ ] Mensaje entrante → respuesta coherente con identidad + conocimiento en <15s p95.
- [ ] Reintento del webhook con el mismo messageId no genera segunda respuesta (test automatizado).
- [ ] Conversación en estado `human|paused`: el bot no responde, el mensaje sí queda en Chatwoot.
- [ ] Caída a mitad de workflow: al reanudar, no se duplican envíos (steps completados no se repiten).
- [ ] Ambos mensajes (in/out) registrados en Chatwoot.
