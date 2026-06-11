---
id: US-011
---

# Tasks — US-011 · Pipeline de respuesta automática

## Overview

Modelo de conversaciones/trazas (T1), cliente LLM (T2), contextBuilder (T3), replyEngine con debounce+lock (T4), enganche al sync (T5), tests (T6–T7).

## Tasks

- [ ] **T1 — Migración: `conversations` y `generations`**
  - Archivos: `apps/backend/drizzle/000X_engine.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: enum mode; fk a channel_links; índices por tenant/conversation; generations con jsonb.
  - FAIL si: prompt sin tenant_id (rompe aislamiento de trazas).
  - Properties: P4
  - Requirements: 1.4, 4.1, 4.2

- [ ] **T2 — `llm` client (Anthropic, tool-use, timeout)**
  - Archivos: `apps/backend/src/integrations/llm.ts`, `apps/backend/src/env.ts`
  - PASS si: generate con tools, usage y latencia; timeout configurable corta la llamada.
  - FAIL si: errores del API no tipados o key logueada.
  - Properties: P4
  - Requirements: 1.1, 3.1, 4.1

- [ ] **T3 — `contextBuilder`**
  - Archivos: `apps/backend/src/services/context-builder.ts`
  - PASS si: integra compileIdentity + retrieve + historial (20 msgs); truncamiento por presupuesto de tokens en orden knowledge→history.
  - FAIL si: contexto de un bot incluye datos de otro.
  - Properties: P3
  - Requirements: 1.2

- [ ] **T4 — `replyEngine`: debounce, lock, envío y registro**
  - Archivos: `apps/backend/src/services/reply-engine.ts`
  - PASS si: ráfaga → 1 respuesta; mode human/paused → no responde; LLM error → mode human + nota; todo con fila en generations.
  - FAIL si: dos generaciones simultáneas para la misma conversación.
  - Properties: P1, P2, P3, P4
  - Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3

- [ ] **T5 — Integración con `messageSync` (US-007)**
  - Archivos: `apps/backend/src/services/message-sync.ts`
  - PASS si: tras reflejar el mensaje en Chatwoot, invoca replyEngine con la conversación resuelta; crea fila en `conversations` si no existe.
  - FAIL si: el reply del bot vuelve a disparar el engine (loop).
  - Properties: P1, P2
  - Requirements: 1.1, 2.1

- [ ] **T6 — Property tests de ráfagas y locks**
  - Archivos: `apps/backend/test/reply-engine.property.test.ts`
  - PASS si: P1/P2 verificadas con fast-check y relojes simulados.
  - FAIL si: flaky.
  - Properties: P1, P2
  - Requirements: 2.1, 2.2, 2.3

- [ ] **T7 — Tests de integración del pipeline**
  - Archivos: `apps/backend/test/reply-engine.test.ts`
  - PASS si: feliz + LLM caído + modo human + tool-use catálogo, con LLM/Evolution/Chatwoot mockeados.
  - FAIL si: requiere servicios reales.
  - Properties: P1–P4
  - Requirements: 1.1, 1.2, 1.3, 3.1, 4.1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2"] },
    { "id": 2, "tasks": ["T3"], "depends_on": [1] },
    { "id": 3, "tasks": ["T4"], "depends_on": [2] },
    { "id": 4, "tasks": ["T5"], "depends_on": [3] },
    { "id": 5, "tasks": ["T6", "T7"], "depends_on": [4] }
  ]
}
```

## Commits

_(SHAs al ejecutar)_

## Research consultada

- _(pendiente: estrategia de debounce/buffering para bots de WhatsApp — ventanas típicas 5–10s)_

## Notes

- Depende de US-007 (sync), US-008 (identidad), US-009 (retrieve), US-010 (catálogo). La memoria (US-013) se integra después vía contextBuilder.
- El buffer de ráfagas es en memoria: aceptable con 1 réplica del backend (MVP). Documentar como limitación.
