---
id: US-012
---

# Tasks — US-012 · Handoff bot ↔ agente humano

## Overview

Estado y auditoría (T1–T2), tool del LLM (T3), control manual API+webhook (T4), UI (T5), tests (T6).

## Tasks

- [x] **T1 — Migración: `conversation_transitions` + `bots.handoff_message`**
  - Archivos: `apps/backend/drizzle/000X_handoff.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: fk a conversations; índice por conversation; default de plantilla.
  - FAIL si: transición sin cause/actor.
  - Properties: P2
  - Requirements: 4.3

- [x] **T2 — `conversationState.setMode` transaccional e idempotente**
  - Archivos: `apps/backend/src/services/conversation-state.ts`
  - PASS si: FOR UPDATE; no-op si mismo modo; labels Chatwoot best-effort.
  - FAIL si: cambio de modo sin fila de transición.
  - Properties: P2, P3
  - Requirements: 3.3, 4.3

- [x] **T3 — Tool `request_human` en replyEngine**
  - Archivos: `apps/backend/src/services/reply-engine.ts`, `apps/backend/src/services/context-builder.ts`
  - PASS si: tool_use → modo human + plantilla al cliente + nota privada con reason; texto del LLM descartado; system prompt instruye usar la tool ante intención de humano.
  - FAIL si: cliente recibe respuesta del LLM además de la plantilla.
  - Properties: P1, P4
  - Requirements: 1.1, 1.2, 1.3, 2.1, 2.2

- [x] **T4 — Endpoint de modo + webhook `conversation_updated`**
  - Archivos: `apps/backend/src/routes/conversations.ts`, `apps/backend/src/routes/webhooks.ts`
  - PASS si: POST mode con permisos; asignación de agente en Chatwoot → human; devolución a bot reactiva el motor.
  - FAIL si: member no asignado cambia modo.
  - Properties: P1, P3
  - Requirements: 3.1, 3.2, 4.1

- [x] **T5 — UI de estado en panel de conversación**
  - Archivos: `apps/frontend/src/pages/conversations/ConversationView.tsx`
  - PASS si: badge de modo con refresh ≤5s; acciones tomar/devolver/pausar según rol; historial de transiciones visible.
  - FAIL si: estado mostrado diverge del backend tras una acción.
  - Properties: P2
  - Requirements: 3.1, 3.2, 3.3, 4.2

- [ ] **T6 — Tests de handoff**
  - Archivos: `apps/backend/test/handoff.test.ts`
  - PASS si: tool→human, devolución→bot responde de nuevo, carreras serializadas, property test de auditoría.
  - FAIL si: flaky.
  - Properties: P1, P2, P3, P4
  - Requirements: 1.1, 2.1, 3.2, 4.1, 4.3

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2"], "depends_on": [1] },
    { "id": 3, "tasks": ["T3", "T4"], "depends_on": [2] },
    { "id": 4, "tasks": ["T5", "T6"], "depends_on": [3] }
  ]
}
```

## Commits

_(SHAs al ejecutar)_

## Research consultada

- _(n/a)_

## Notes

- Depende de US-011 (conversations.mode y replyEngine).
- Decisión: la detección de "quiero un humano" la hace el LLM vía tool, no regex — más robusta en español coloquial. Documentar fallback si se observan fallos.
