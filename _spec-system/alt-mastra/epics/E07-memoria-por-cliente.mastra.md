---
id: E07-M
variant-of: E07
title: Memoria por cliente (alternativa Mastra)
status: draft
owner: @diego
---

> **Alternativa con Mastra** de [E07](../../epics/E07-memoria-por-cliente.md). No reemplaza la épica original.

## Objetivo

Mismo objetivo que E07: que el agente recuerde a cada cliente entre conversaciones. La diferencia: en lugar de construir perfil + resumen incremental a mano, se usa el sistema de **Memory de Mastra** mapeado a nuestro dominio.

## Enfoque con Mastra

- **Mapeo de dominio**: `resource` = contacto (`tenantId:botId:phoneNormalizado`), `thread` = conversación. La memoria a nivel de *resource* persiste entre threads → eso es exactamente "memoria por cliente entre conversaciones".
- **Hechos clave-valor** → **Working Memory** con scope `resource` y schema Zod (nombre, preferencias, contexto de negocio). El agente la actualiza solo durante la conversación; no hace falta job de extracción propio.
- **Resumen del historial** → dos opciones, en orden de preferencia:
  1. **Observational Memory / summarization de Mastra** sobre el historial del thread (el framework condensa contexto automáticamente).
  2. Step final del workflow (al cerrar/inactivar conversación) que pide al LLM un rolling summary y lo guarda en working memory — equivalente 1:1 al diseño original si la opción 1 no da el control suficiente.
- **Persistencia**: `PostgresStore` (`@mastra/pg`) en nuestro Postgres de Dokploy. **No** se usa el Memory Gateway de Platform.
- **Dashboard**: la vista de memoria lee/escribe las tablas de Mastra vía su API de Memory (`getWorkingMemory`/`updateWorkingMemory`); editable como pide la épica original.
- **Semantic recall** (recuperar mensajes viejos por similitud): disponible casi gratis con el PgVector ya montado en E05-M; se marca como *opcional post-MVP* (la épica original lo excluye).

## Alcance

**Dentro**:
- Memory con working memory por resource + historial por thread, storage en nuestro Postgres.
- Inyección automática de memoria en el contexto del agente (E06-M) — sin código de "armar contexto" propio.
- Resumen al cerrar conversación (opción 1 o 2).
- Vista de memoria editable en el dashboard.

**Fuera** (igual que E07):
- Memoria compartida entre bots de un tenant (el namespacing del resource lo impide por diseño).
- Borrado selectivo por solicitud del cliente (deuda de compliance, igual que el original).
- Memoria episódica avanzada con embeddings (semantic recall queda opcional).

## Consideraciones de la capa gratuita

- Al usar `PostgresStore` propio, **no aplican** los límites del Memory Gateway (100K memory tokens/mes, 250 MB retrieval, retención de threads de 15 días). Esto es decisivo: con el Gateway free, la memoria de clientes inactivos >15 días se consideraría *stale* — incompatible con "recordar al cliente que vuelve al mes".
- El costo real de la memoria es el de los tokens extra en cada prompt (BYOK): limitar con `TokenLimiter` y schema acotado de working memory.

## Criterios de salida (equivalentes a E07)

- [ ] En una segunda conversación (nuevo thread, mismo resource), el agente usa datos de la primera (p. ej. saluda por nombre), incluso >15 días después.
- [ ] La working memory de un contacto es visible y editable desde el dashboard.
- [ ] Aislamiento verificado: el mismo teléfono en dos tenants produce dos resources distintos y dos memorias independientes.

## Historias de esta vertiente

| ID | Título | Equivale a |
| --- | --- | --- |
| [US-013-M](../stories/US-013-memoria-cliente.mastra.md) | Memoria por contacto con Memory de Mastra | US-013 |
