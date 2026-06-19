---
id: E13
title: Desacople agente ↔ canal y biblioteca de conocimiento
status: draft
owner: @diego
---

## Objetivo

Romper la fusión actual `bot = agente = canal = conocimiento`. Introducir el **Agente** como entidad
propia (el "cerebro": identidad/prompt + modelo + conocimiento enlazado), separada del **canal**
(transporte) y del **conocimiento** (biblioteca reutilizable). Tras esta épica, un mismo agente puede
atender varios canales (WhatsApp + Instagram + Telegram), distintos canales pueden ir a distintos
agentes, el conocimiento vive en colecciones que cualquier agente del tenant puede enlazar/heredar, y un
mismo cliente que escribe por varios canales del agente comparte memoria cuando coincide su identificador.

Base de la fase 2 (E14: ruteo multi-agente por reglas dentro de un mismo canal).

> Referencia: `research/2026-06-18-desacople-agentes-canales.md` (decisiones del cuestionario).

## Alcance

**Dentro**:
- Entidad `Agent` propia + migración automática `bot → agente` (1 agente por bot, sin pérdida de datos).
- Identidad (SOUL/IDENTITY/GUARDRAILS) y modelo **propios** del agente.
- Relación **N:M canal ↔ agente** (en esta fase, cada canal se enlaza a exactamente un agente).
- Ruteo de inbound resuelto por **agente** (pipeline opera sobre `agentId`, no `botId`).
- Biblioteca de **colecciones de conocimiento** reutilizables + enlace N:M a agentes (referencia viva).
- `retrieve()` por agente sobre las colecciones enlazadas, con aislamiento por tenant.
- Identidad de contacto **unificada entre canales** del mismo agente por identificador (teléfono/email);
  memoria/facts/datos extraídos re-anclados al contacto unificado.
- UI: gestión de agentes (crear/editar, identidad, modelo, asignar canales, enlazar colecciones).

**Fuera** (→ E14):
- Varios agentes sobre un mismo canal.
- Motor de reglas de ruteo / agente orquestador.
- Cambio de agente a mitad de conversación (descartado por diseño: el agente se fija al inicio).
- Etapa/segmento del cliente y su origen (manual/CRM/label).

## Criterios de salida (definition of done de la épica)

- [ ] Existe la entidad Agente y cada bot existente quedó migrado a un agente sin pérdida de datos (idempotente).
- [ ] Un agente puede tener varios canales asignados y atiende el inbound de todos ellos con un único cerebro.
- [ ] El conocimiento vive en colecciones reutilizables; un agente enlaza colecciones de la biblioteca y su `retrieve()` las usa, propagando cambios (referencia viva) con aislamiento por tenant.
- [ ] Un mismo cliente que escribe por dos canales del mismo agente comparte memoria/contexto cuando coincide su identificador.
- [ ] La UI permite crear/editar agentes, editar su identidad y modelo, asignarles canales y enlazar colecciones.
- [ ] El pipeline conversacional opera sobre `agentId` sin romper conversaciones existentes.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (5)

**Progreso:** 0/5 en producción (0%) · Levantamiento de requerimientos: 5

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-030](../stories/US-030-entidad-agente-migracion/index.md) | Entidad Agente y migracion bot->agente | — | Levantamiento de requerimientos | P0 |
| [US-031](../stories/US-031-asignacion-canal-agente-ruteo/index.md) | Asignación N:M canal-agente y ruteo de inbound por agente | — | Levantamiento de requerimientos | P0 |
| [US-032](../stories/US-032-biblioteca-conocimiento-colecciones/index.md) | Biblioteca de conocimiento reutilizable y enlace a agentes | — | Levantamiento de requerimientos | P0 |
| [US-033](../stories/US-033-identidad-contacto-unificada/index.md) | Identidad de contacto unificada entre canales | — | Levantamiento de requerimientos | P1 |
| [US-034](../stories/US-034-ui-gestion-agentes/index.md) | UI de gestion de agentes | — | Levantamiento de requerimientos | P1 |

<!-- DASHBOARD:END -->
