---
id: US-037
---

# Tasks — US-037 · Agente orquestador de ruteo (fallback LLM)

## Overview

Modelo y trazabilidad primero (T1: tabla `channel_orchestrators` + relajación de `generations`), luego el soporte de salida restringida en el cliente LLM (T2) y el contexto de clasificación (T3). Sobre esa base, el servicio del orquestador con su gating, fallback y traza (T4). Por último, las rutas de configuración (T5) y los tests de aislamiento, salida restringida y fallback (T6). El servicio se construye como función pura `resolve()` que US-038 encadenará tras el no-match de reglas.

## Tasks

- [ ] **T1 — Migración: `channel_orchestrators` + relajar `generations` para traza de ruteo**
  - Archivos: `apps/backend/drizzle/00XX_orchestrator.sql`, `apps/backend/src/db/schema.ts`
  - PASS si: `pnpm db:migrate` aplica; `channel_orchestrators` con pk `channel_id` (1:1, cascade), `tenant_id`, `instructions` nullable, `enabled` default true; `generations` admite una traza sin `conversation_id`/`bot_id` (nullable o `kind`).
  - FAIL si: nombres/tipos divergen del data model del diseño, o `generations` deja de aceptar las trazas de conversación existentes.
  - Properties: P4, P5
  - Requirements: 1.1, 1.2, 6.1, 6.5

- [ ] **T2 — Salida restringida en `generate()`: `toolChoice` forzado**
  - Archivos: `apps/backend/src/integrations/llm.ts`
  - PASS si: `generate()` acepta `toolChoice` opcional y lo envía como `tool_choice` a la Messages API; los callers existentes (reply-engine) siguen compilando y funcionando sin pasar `toolChoice`.
  - FAIL si: se rompe la firma actual o `tool_choice` se envía cuando no se pide.
  - Properties: P1
  - Requirements: 3.1

- [ ] **T3 — `orchestratorContext.build()`**
  - Archivos: `apps/backend/src/services/orchestrator-context.ts`
  - PASS si: devuelve `{ stage, facts, extracted, lastMessage }` del contacto del tenant; tolera etapa/facts/extracted/último mensaje ausentes sin lanzar.
  - FAIL si: lanza ante contacto sin etapa/facts/datos, o lee datos de otro tenant.
  - Properties: P5
  - Requirements: 4.1, 4.2

- [ ] **T4 — `orchestratorService`: gating + router restringido + fallback + traza**
  - Archivos: `apps/backend/src/services/orchestrator.ts`
  - PASS si: 0 candidatos → ausencia sin LLM; deshabilitado → default sin LLM; 1 candidato → ese agente sin LLM; ≥2 habilitado → router con enum de candidatos, valida elección, cae a default ante error/timeout/elección inválida; cada invocación deja traza (response o error); fallback marcado.
  - FAIL si: `resolve` devuelve un id fuera de candidatos, propaga la excepción del LLM, o invoca el LLM en algún caso de gating que no lo requiere.
  - Properties: P1, P2, P3, P4, P6
  - Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4

- [ ] **T5 — Rutas `GET/PUT /api/channels/:id/orchestrator`**
  - Archivos: `apps/backend/src/routes/channel-orchestrator.ts`, `apps/backend/src/index.ts`
  - PASS si: PUT upsert persiste instrucciones+enabled; GET devuelve instrucciones, enabled y candidatos vigentes; sin instrucciones → marcado como sin instrucciones; admin escribe, member lee; canal de otro tenant → 403.
  - FAIL si: acceso cross-tenant exitoso o member puede escribir la config.
  - Properties: P5
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5

- [ ] **T6 — Tests: salida restringida, gating, fallback y aislamiento**
  - Archivos: `apps/backend/test/orchestrator.test.ts`
  - PASS si: con LLM fake, `resolve` nunca emite id fuera de candidatos (P1); error/timeout/elección inválida intercalados siempre caen a default o null (P3); gating no invoca LLM en 0/1 candidato ni deshabilitado (P2/P6); traza presente con response o error (P4); aislamiento cross-tenant en config y trazas (P5).
  - FAIL si: los tests llaman a la Messages API real, o son no determinísticos.
  - Properties: P1, P2, P3, P4, P5, P6
  - Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.4, 5.1, 5.3, 5.4, 6.2, 6.3, 6.5

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1", "T2", "T3"] },
    { "id": 2, "tasks": ["T4"], "depends_on": [1] },
    { "id": 3, "tasks": ["T5", "T6"], "depends_on": [2] }
  ]
}
```

## Commits

- _(pendiente)_

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — D1 (ruteo híbrido: reglas + fallback a orquestador), Q6 (etapa del contacto como insumo de clasificación) y la frontera E14 que ubica al orquestador como fallback del motor de reglas.

## Notes

- Supuesto: la cadena que invoca `resolve()` tras el no-match de US-036 y fija el resultado en `conversations.agent_id` es propiedad de US-038; aquí `resolve()` se entrega como función de servicio independiente y testeable.
- Dependencia: requiere `agent_channels` N:M y `channels.default_agent_id` (US-035) y el motor de reglas (US-036) para el escenario completo de no-match; los tests de US-037 mockean el no-match.
- El modelo del router es el global `env.LLM_MODEL` (no por agente); `env.LLM_TIMEOUT_MS` acota la latencia del peor caso.
- Relajar `generations` debe preservar las trazas de conversación de US-011 (verificar antes de T1).
