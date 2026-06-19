---
id: US-037
title: Agente orquestador de ruteo (fallback LLM)
epic: E14
cycle: null
status: Levantamiento de requerimientos
priority: P2
estimate: M
owner: @diego
---

# US-037 · Agente orquestador de ruteo (fallback LLM)

**Como** plataforma, **quiero** un orquestador que, cuando ninguna regla aplica, clasifique el contexto y elija el agente, **para** cubrir casos no contemplados por las reglas.

El motor de reglas determinista (US-036) no siempre decide: un cliente puede no encajar en ninguna condición. Esta historia añade el segundo escalón del ruteo híbrido (D1): un router LLM por canal que, dado el contexto del contacto y el mensaje, elige UN agente de entre los candidatos del canal con salida restringida (nunca inventa), se invoca solo en no-match de reglas para no gastar coste ni latencia de más, y cae al agente por defecto del canal (US-035) si falla o devuelve algo inválido. Cada invocación queda trazada en `generations`.

## Documentos

- [Requerimientos](./requirements.md) — el **qué** (EARS).
- [Diseño](./design.md) — el **cómo** (arquitectura, contratos, propiedades).
- [Tareas](./tasks.md) — el **en qué orden** (tareas + grafo de waves).
