---
id: US-010-M
variant-of: US-010
title: Catálogo como tool del agente
epic: E05-M
status: draft
priority: P1
estimate: M
owner: @diego
---

# US-010-M · Catálogo como tool del agente

**Como** admin de tenant, **quiero** gestionar el catálogo de productos/servicios de mi negocio, **para** que el bot dé información precisa de precios y disponibilidad.

> Equivale a [US-010](../../stories/US-010-catalogo-productos/index.md). El CRUD es idéntico al original (Mastra no aporta nada ahí); lo que cambia es **cómo lo consume el motor**.

## Qué cambia respecto al original

| Original | Con Mastra |
| --- | --- |
| Función interna de consulta que el pipeline llama para inyectar productos al prompt | Tool tipada `searchCatalog` (`createTool` + Zod) que **el LLM invoca cuando la necesita** |
| El motor decide qué productos inyectar (heurística propia) | El agente decide cuándo y qué buscar; menos tokens fijos por turno |

## Diseño (resumen)

1. **CRUD** (sin cambios): tabla `products` en Drizzle con `tenantId`, `botId`, nombre, descripción, precio, disponibilidad, metadatos. Endpoints Hono + UI dashboard.
2. **Tool `searchCatalog`**:
   - Input (Zod): `{ query?: string, onlyAvailable?: boolean, limit?: number }`.
   - El `tenantId/botId` sale de `RuntimeContext`, nunca del input del LLM.
   - Output: lista compacta `{ name, price, available, shortDescription }` (limitar tokens de salida).
3. **Búsqueda**: `ILIKE`/trigram sobre nombre y descripción (suficiente para MVP; el catálogo NO se embebe — la fuente de verdad de precios debe ser exacta, no semántica).
4. **Registro**: la tool se agrega al agente de US-011-M junto al retrieval de US-009-M.

## Free tier

- Sin impacto: todo vive en nuestro Postgres y backend. La tool solo añade tokens cuando el LLM la usa (BYOK).

## Criterios de aceptación

- [ ] El agente responde precio y disponibilidad reales consultando `searchCatalog` (verificable en la traza: tool call presente).
- [ ] Cambios de precio/disponibilidad en el dashboard se reflejan en la siguiente respuesta del bot (sin reindexar nada).
- [ ] La tool solo devuelve productos del tenant/bot del contexto (test de aislamiento).
- [ ] Producto no disponible: el bot lo comunica, no lo inventa disponible.
