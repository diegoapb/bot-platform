---
id: E04
title: Identidad del agente
status: ready
owner: @diego
---

## Objetivo

Que el tenant defina quién es su agente: personalidad, tono, reglas y límites, mediante documentos de identidad (`SOUL.md`, `IDENTITY.md`, `GUARDRAILS.md`) editables desde el dashboard y versionados. Esta identidad alimenta el system prompt del motor conversacional (E06).

## Alcance

**Dentro**:
- Modelo de documentos de identidad por bot, con tipos predefinidos y contenido markdown.
- Editor en el dashboard con preview y plantillas iniciales por tipo.
- Versionado: historial de cambios y posibilidad de restaurar una versión.
- Endpoint interno que compila la identidad vigente para el motor.

**Fuera**:
- Conocimiento factual y catálogo (E05).
- Memoria por cliente (E07).
- Evaluación automática de calidad del prompt.

## Criterios de salida

- [ ] Un admin edita el `SOUL.md` de su bot y la versión queda registrada con autor y fecha.
- [ ] El motor puede obtener la identidad compilada de un bot en una sola llamada interna.
- [ ] Restaurar una versión anterior deja esa versión como vigente sin perder historial.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (1)

**Progreso:** 0/1 en producción (0%) · Pendiente desarrollo: 1

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-008](../stories/US-008-identidad-agente/index.md) | Gestión de identidad del agente | C01 | Pendiente desarrollo | P1 |

<!-- DASHBOARD:END -->
