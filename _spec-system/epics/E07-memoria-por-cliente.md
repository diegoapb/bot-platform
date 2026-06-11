---
id: E07
title: Memoria por cliente
status: ready
owner: @diego
---

## Objetivo

Que el agente recuerde a cada cliente entre conversaciones: hechos, preferencias y un resumen del historial, persistidos por contacto y consultados/actualizados por el motor en cada interacción.

## Alcance

**Dentro**:
- Perfil de contacto por tenant/bot (teléfono normalizado como clave natural).
- Memoria estructurada: hechos clave-valor (nombre, preferencias, contexto de negocio).
- Resumen incremental de conversaciones (rolling summary) generado al cerrar/inactivar conversación.
- Inyección de memoria en el contexto del pipeline (E06) y vista de memoria en el dashboard.

**Fuera**:
- Memoria compartida entre bots de un mismo tenant.
- Borrado selectivo por solicitud del cliente (se documenta como deuda de compliance).
- Embeddings de memoria episódica avanzada.

## Criterios de salida

- [ ] En una segunda conversación, el bot usa datos de la primera (p. ej. saluda por nombre).
- [ ] La memoria de un contacto es visible y editable desde el dashboard.
- [ ] Memorias aisladas por tenant/bot: un contacto en dos tenants tiene dos memorias independientes.

<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->

## Historias de la épica (1)

**Progreso:** 0/1 en producción (0%) · Pendiente de pruebas: 1

| ID | Título | Ciclo | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| [US-013](../stories/US-013-memoria-cliente/index.md) | Memoria persistente por cliente | C01 | Pendiente de pruebas | P1 |

<!-- DASHBOARD:END -->
