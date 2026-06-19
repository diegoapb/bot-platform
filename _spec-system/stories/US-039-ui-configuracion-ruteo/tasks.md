---
id: US-039
---

# Tasks — US-039 · UI de configuracion de ruteo multi-agente

## Overview

Es una historia de frontend que consume contratos de E14 (US-035 a US-038). Se construye de adentro hacia afuera: primero el cliente API y los tipos (T1), luego los paneles independientes (candidatos+default T2, reglas+constructor T3, orquestador T4, simulador T5), la pagina contenedora con gating y ruteo (T6), y por ultimo los tests de propiedades e integracion del flujo completo (T7). Sin backend nuevo: los endpoints los proveen US-035/036/037/038.

## Tasks

- [ ] **T1 — Cliente API de ruteo + tipos en `lib/api.ts`**
  - Archivos: `apps/frontend/src/lib/api.ts`
  - PASS si: `useApi` expone `getChannelRouting`, `addCandidate`, `removeCandidate`, `setDefaultAgent`, `createRule`, `updateRule`, `reorderRules`, `deleteRule`, `updateOrchestrator`, `simulateRouting` con Bearer de Clerk y desempaquetado `json.data`; tipos `ChannelRouting`, `RoutingRule`, `RoutingAgent`, `OrchestratorConfig`, `SampleContact`, `SimulationResult` exportados.
  - FAIL si: algun metodo diverge de las rutas/DTOs del diseño o el simulador usa un metodo de escritura.
  - Properties: P1
  - Requirements: 1.1, 2.1, 3.1, 4.1, 5.1

- [ ] **T2 — `ChannelAgentsPanel`: candidatos + agente por defecto**
  - Archivos: `apps/frontend/src/pages/channels/ChannelAgentsPanel.tsx`
  - PASS si: lista candidatos y agente por defecto; agregar/quitar candidato y elegir default invalidan la query; quitar un candidato que es default o destino de regla queda impedido con motivo; member ve solo lectura.
  - FAIL si: la baja de un candidato en uso se envia igual, o member ve controles de escritura.
  - Properties: P1, P2, P7
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2

- [ ] **T3 — `RoutingRulesPanel` + `ConditionBuilder`: alta/edicion/orden/habilitacion/borrado**
  - Archivos: `apps/frontend/src/pages/channels/RoutingRulesPanel.tsx`, `apps/frontend/src/pages/channels/ConditionBuilder.tsx`
  - PASS si: reglas listadas por prioridad asc; constructor ofrece solo campos del contacto y operadores soportados; destino restringido a candidatos; guardado bloqueado sin destino o condicion incompleta; reorden envia un solo `reorderRules`; activar/desactivar y borrar reflejan estado; reglas deshabilitadas distinguidas; rechazo del backend conserva datos.
  - FAIL si: la UI envia una regla con destino fuera de candidatos, o el orden mostrado no coincide con el enviado.
  - Properties: P1, P2, P3, P4, P7
  - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2

- [ ] **T4 — `OrchestratorPanel`: instrucciones + candidatos elegibles**
  - Archivos: `apps/frontend/src/pages/channels/OrchestratorPanel.tsx`
  - PASS si: muestra y edita instrucciones; marca/desmarca elegibles solo entre candidatos del canal; cambios invalidan la query; rechazo del backend conserva valores; member en solo lectura.
  - FAIL si: ofrece como elegible un agente que no es candidato del canal.
  - Properties: P1, P2, P3, P7
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2

- [ ] **T5 — `RoutingSimulator`: contacto de ejemplo -> decision explicada**
  - Archivos: `apps/frontend/src/pages/channels/RoutingSimulator.tsx`
  - PASS si: captura stage/tags/facts/extracted; ejecuta `simulateRouting`; muestra agente y via (rule/orchestrator/default/none) e identifica la regla cuando via=rule; cambiar la entrada y resimular no arrastra el resultado previo; disponible para member.
  - FAIL si: el simulador dispara cualquier mutacion o persiste el contacto de ejemplo.
  - Properties: P5, P6
  - Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.3

- [ ] **T6 — `RoutingConfigPage` + ruteo y navegacion**
  - Archivos: `apps/frontend/src/pages/channels/RoutingConfigPage.tsx`, `apps/frontend/src/App.tsx`, `apps/frontend/src/components/Layout.tsx`
  - PASS si: carga la configuracion del canal con estado de carga y error+reintentar; compone las cuatro secciones; deshabilita reglas/orquestador/default cuando no hay candidatos; gatea escritura por `orgRole`; ruta `/channels/:channelId/routing` accesible; mutaciones en curso evitan envios duplicados.
  - FAIL si: se muestran datos parciales durante la carga o un member ve controles de escritura.
  - Properties: P1, P2, P7
  - Requirements: 1.6, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4

- [ ] **T7 — Tests de propiedades e integracion del flujo**
  - Archivos: `apps/frontend/test/routing-config.test.tsx`
  - PASS si: property-based con cliente API fake cubre P2 (member sin escritura, simulador si), P3 (destino y elegibles ⊆ candidatos), P4 (orden mostrado = enviado), P7 (ok⇒nuevo, error⇒previo); integracion cubre carga->candidato->regla->reorden->reflejo, simulacion de cada via, member en solo lectura, y que el simulador no dispara mutaciones (P5).
  - FAIL si: algun test llama a un backend real o no es determinista.
  - Properties: P2, P3, P4, P5, P6, P7
  - Requirements: 1.5, 2.5, 3.2, 5.2, 5.6, 7.2, 7.3

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "tasks": ["T1"] },
    { "id": 2, "tasks": ["T2", "T3", "T4", "T5"], "depends_on": [1] },
    { "id": 3, "tasks": ["T6"], "depends_on": [2] },
    { "id": 4, "tasks": ["T7"], "depends_on": [3] }
  ]
}
```

## Commits

- _(pendiente)_

## Research consultada

- `research/2026-06-18-desacople-agentes-canales.md` — fundamenta el modelo de ruteo hibrido (reglas deterministas + orquestador LLM + agente por defecto), la fijacion del agente al inicio de la conversacion (D3) y el alcance de la administracion por canal que esta UI expone.

## Notes

- Depende de los contratos de backend de US-035 (candidatos, agente por defecto, etapa del contacto), US-036 (reglas y DSL de condiciones), US-037 (configuracion del orquestador) y US-038 (resolver). Si esos contratos cambian, ajustar `lib/api.ts` (T1).
- El simulador requiere un endpoint dry-run del resolver de US-038 (`POST /api/channels/:id/routing/simulate`) que resuelva sin crear conversacion ni contacto (P5). Confirmar/coordinar ese contrato con US-038 antes de T5.
- Supuesto: la condicion (DSL) se serializa como el mismo arbol jsonb que define US-036; el `ConditionBuilder` produce y consume ese formato sin reinterpretarlo.
- Reutiliza primitivas del design system (E09); el drag-and-drop del reorden usa la primitiva existente o un fallback de botones subir/bajar.
- Esta UI no es la frontera de seguridad: refleja permisos y aislamiento, pero la autorizacion real la impone el backend.
