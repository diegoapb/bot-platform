---
id: E08
title: Operación y observabilidad MVP
status: ready
owner: @diego
---

## Objetivo

Cerrar el círculo operativo: panel para ver conversaciones y métricas por tenant, control bot on/off por conversación, trazas de cada respuesta generada y el despliegue productivo del MVP en Dokploy.

## Alcance

**Dentro**:
- Panel de conversaciones: lista, estado (`bot|human`), último mensaje, toggle de bot.
- Métricas básicas por tenant: mensajes, conversaciones atendidas por bot vs humano, handoffs.
- Log de generaciones del LLM (prompt, respuesta, tokens, latencia) consultable por bot.
- Despliegue productivo: compose en Dokploy, dominios, env de producción y healthchecks.

**Fuera**:
- Facturación y cuotas por tenant.
- Alertas/incidentes automatizados.
- Analytics avanzado (funnels, CSAT).

## Criterios de salida

- [ ] Un admin pausa el bot en una conversación concreta y el motor lo respeta de inmediato.
- [ ] Las métricas del tenant reflejan la actividad del día sin acceso a datos de otros tenants.
- [ ] El MVP corre en producción (Dokploy) con healthchecks verdes y webhooks públicos estables.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (1)

**Progreso:** 0/1 en producción (0%) · En implementación: 1

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-014](../stories/US-014-panel-operacion/index.md) | Panel de operación y despliegue MVP | C01 | En implementación | P1 |

<!-- DASHBOARD:END -->
