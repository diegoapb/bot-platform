---
id: E14
title: Ruteo multi-agente por reglas dentro de un canal
status: draft
owner: @diego
---

## Objetivo

Habilitar que **un mismo canal sea atendido por varios agentes**, eligiendo cuál atiende a cada cliente
según su contexto y etapa de relación. El ruteo es **híbrido**: primero reglas deterministas y auditables
sobre los datos del contacto y, si ninguna aplica, un **agente orquestador** (LLM) elige entre los agentes
candidatos del canal, con caída final a un agente por defecto. El agente resuelto se **fija al inicio de la
conversación** y no cambia en caliente; una conversación nueva se re-resuelve.

Escenario guía: Juan (post-compra) → agente de **garantías**; Felipe (cliente nuevo) → agente de
**información de productos**; ambos por el **mismo canal**.

> Depende de E13 (entidad agente, N:M canal↔agente, conversación con `agentId` fijado).
> Referencia: `research/2026-06-18-desacople-agentes-canales.md`.

## Alcance

**Dentro**:
- Varios agentes candidatos por canal + **agente por defecto** del canal (relaja la restricción 1:1 de E13).
- **Etapa/segmento** del contacto (p.ej. pre-venta / post-venta) como dato enrutable.
- **Motor de reglas declarativas** (condición sobre datos del contacto → agente) evaluado por prioridad, determinista y testeable.
- **Agente orquestador** (router LLM) como *fallback* cuando ninguna regla aplica, con salida restringida a los agentes candidatos del canal.
- **Resolución y fijación** del agente al inicio de la conversación (reglas → orquestador → default), persistida y no re-evaluada en caliente; re-resolución al abrir una conversación nueva.
- UI: agentes del canal, constructor de reglas con prioridad, configuración del orquestador y del default, simulador de ruteo.

**Fuera**:
- Cambio de agente a mitad de conversación (decisión de diseño: no se hace en caliente).
- Unificación de identidad de contacto entre agentes distintos (el contacto es por agente — E13).
- Integraciones CRM externas como fuente de la etapa (se contempla el origen manual y por label de Chatwoot; CRM queda como extensión futura).

## Criterios de salida (definition of done de la épica)

- [ ] Un canal puede tener varios agentes candidatos y un agente por defecto.
- [ ] Existe un motor de reglas determinista que mapea condiciones del contacto (etapa, tags, facts, datos extraídos) a un agente, evaluado por prioridad.
- [ ] Cuando ninguna regla aplica, el orquestador LLM elige entre los agentes candidatos, con *fallback* al agente por defecto.
- [ ] El agente se resuelve y fija al inicio de la conversación y no cambia en caliente; una conversación nueva se re-resuelve.
- [ ] El escenario Juan (post-venta → garantías) y Felipe (pre-venta → info) se resuelve a agentes distintos en el mismo canal.
- [ ] La UI permite configurar agentes del canal, reglas, orquestador y simular el ruteo para un contacto de ejemplo.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->
<!-- DASHBOARD:END -->
