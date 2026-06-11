---
id: US-013
---

# Tasks — US-013 · Memoria persistente por cliente

## Overview

Modelo (T1), servicio de memoria (T2), extracción LLM + job (T3), inyección al contexto (T4), API+UI (T5), tests (T6).

## Tasks

- [ ] **T1 — Migración: `contact_memories`, `contact_facts`, `conversations.consolidated_at`**
  - Archivos: `apps/backend/drizzle/000X_memory.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: unique `(channel_link_id, key)`; fks correctas; reset de consolidated_at documentado en sync.
  - FAIL si: facts sin tenant_id.
  - Properties: P1, P3
  - Requirements: 2.2, 3.3

- [ ] **T2 — `memoryService`: get/upsert/delete/wipe**
  - Archivos: `apps/backend/src/services/memory.ts`
  - PASS si: upsert idempotente por clave; wipe transaccional; getMemory scopeado.
  - FAIL si: cross-tenant leak.
  - Properties: P1, P3
  - Requirements: 1.1, 1.2, 1.3, 2.2, 3.2, 3.3

- [ ] **T3 — Extracción LLM + job de consolidación**
  - Archivos: `apps/backend/src/services/memory.ts`, `apps/backend/src/jobs/memory-consolidation.ts`, `apps/backend/src/integrations/llm.ts`
  - PASS si: JSON validado con Zod; fallo → memoria intacta + marca; resumen ≤2000 chars; job sin solape.
  - FAIL si: fallo de LLM borra o corrompe memoria.
  - Properties: P2, P4
  - Requirements: 2.1, 2.3, 2.4

- [ ] **T4 — Inyección en `contextBuilder` (US-011)**
  - Archivos: `apps/backend/src/services/context-builder.ts`
  - PASS si: bloque de memoria presente cuando existe; ausencia silenciosa cuando no; reset de consolidated_at al llegar mensaje.
  - FAIL si: memoria de otro contacto/bot en el prompt.
  - Properties: P1
  - Requirements: 1.1, 1.2, 1.3

- [ ] **T5 — Rutas de contactos/memoria + `ContactView`**
  - Archivos: `apps/backend/src/routes/contacts.ts`, `apps/frontend/src/pages/contacts/ContactView.tsx`
  - PASS si: lista de contactos, hechos editables con origen, resumen visible, wipe con doble confirmación; member solo lectura.
  - FAIL si: edición sin registrar origen `humano`.
  - Properties: P1, P3
  - Requirements: 3.1, 3.2, 3.3

- [ ] **T6 — Tests de memoria**
  - Archivos: `apps/backend/test/memory.test.ts`
  - PASS si: consolidación feliz/fallida, segunda conversación con memoria, aislamiento dos tenants mismo teléfono, properties P3/P4.
  - FAIL si: requiere LLM real.
  - Properties: P1, P2, P3, P4
  - Requirements: 1.3, 2.1, 2.3, 2.4

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

- _(pendiente: patrones de memoria de agentes — facts vs episodic, rolling summaries)_

## Notes

- Depende de US-007 (channel_links) y US-011 (conversations, contextBuilder, llm client).
- Borrado por solicitud del cliente final (GDPR-like) documentado como deuda en la épica E07.
