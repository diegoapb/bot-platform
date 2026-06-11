# Alternativa Mastra — E05 / E06 / E07

> **Vertiente alternativa, no reemplazo.** Las épicas e historias originales en `../epics/` y `../stories/` siguen siendo la fuente de verdad. Esta carpeta documenta cómo se implementarían las mismas épicas/historias si se adopta [Mastra](https://mastra.ai/) como framework de agentes para el MVP.

## Qué es Mastra en este contexto

- **Framework open source (Apache 2.0, TypeScript)**: agentes, workflows durables, RAG (chunking + embeddings + vector stores), memoria (threads/resources, working memory, semantic recall) y observabilidad. Gratis, sin límites, se puede embeber en nuestro backend Hono (existe adapter oficial de Hono) o desplegar como servidor standalone.
- **Mastra Platform (capa gestionada)**: deploy del servidor de agentes, observabilidad (logs/metrics/traces), Studio y Memory Gateway. Tiene plan **Starter gratuito**, que es el que se asume para el MVP.

## Límites del plan Starter (free) — verificados en mastra.ai/pricing (jun 2026)

| Recurso | Incluido gratis | Excedente |
| --- | --- | --- |
| Observabilidad (logs/metrics/traces) | 100K eventos/mes | $10 / 100K |
| CPU time (Server) | 24 h/mes | $0.35/h |
| Data egress | 10 GB/mes | $0.10/GB |
| Servidor persistente 24/7 | **No incluido** (serverless con scale-to-zero) | $100/proyecto/mes |
| Memory Gateway — memory tokens | 100K/mes | $10 / 1M |
| Memory Gateway — retrieval storage | 250 MB | $20/GB |
| Memory Gateway — tokens LLM | Market rate + 5.5% (o **BYOK** sin recargo) | — |
| Data storage (Platform) | 1 GB | — |
| Retención de datos / stale threads | 15 días | — |
| Usuarios, proyectos, deployments | Ilimitados | — |

## Decisiones de arquitectura derivadas de esos límites

1. **Framework sí, Gateway no (para datos)**: el código usa el framework Mastra (gratis). Vectores, memoria e historial se persisten en **nuestro Postgres** (Dokploy) vía `@mastra/pg` (`PostgresStore` + `PgVector`). Así los límites de 250 MB de retrieval storage, 100K memory tokens y 15 días de retención del Gateway **no aplican** a los datos del negocio.
2. **BYOK para el LLM**: la key de OpenAI/Anthropic es nuestra → sin recargo del 5.5%.
3. **Hosting del runtime**: dos variantes compatibles con $0:
   - **A (recomendada)**: Mastra embebido en `apps/backend` (Hono) y desplegado en nuestro VPS con Dokploy. Platform Starter se usa solo para observabilidad (100K eventos/mes) y Studio. Sin cold starts, sin consumir CPU hours.
   - **B**: servidor Mastra desplegado en Platform Starter (serverless). Restricción: scale-to-zero ⇒ cold starts que comen el presupuesto de <15s del criterio de E06, y 24 h CPU/mes como techo duro.
4. **Presupuesto de observabilidad**: ~100K eventos/mes ≈ 3.300 eventos/día. Un turno de conversación genera múltiples spans (agente, tools, memoria). Hay que muestrear/filtrar trazas (span filtering) desde el día 1.
5. **Multi-tenancy**: no hay aislamiento nativo por tenant en Mastra; se implementa con `RuntimeContext` (tenantId/botId inyectados por request) + filtros de metadata en PgVector + claves `resource`/`thread` namespaced. Mismo requisito de aislamiento que las épicas originales.

## Mapa de equivalencias

| Original | Alternativa Mastra | Qué cambia |
| --- | --- | --- |
| [E05](../epics/E05-conocimiento-y-catalogo.md) | [epics/E05-mastra](./epics/E05-conocimiento-y-catalogo.mastra.md) | RAG manual → `MDocument.chunk()` + `embed` + `PgVector` + `createVectorQueryTool()` |
| [E06](../epics/E06-motor-conversacional.md) | [epics/E06-mastra](./epics/E06-motor-conversacional.mastra.md) | Pipeline manual → `Agent` + workflow durable con suspend/resume |
| [E07](../epics/E07-memoria-por-cliente.md) | [epics/E07-mastra](./epics/E07-memoria-por-cliente.mastra.md) | Memoria manual → `Memory` (resources/threads + working memory) |
| [US-009](../stories/US-009-base-conocimiento/index.md) | [stories/US-009-mastra](./stories/US-009-base-conocimiento.mastra.md) | Ingestión con primitivas RAG de Mastra |
| [US-010](../stories/US-010-catalogo-productos/index.md) | [stories/US-010-mastra](./stories/US-010-catalogo-productos.mastra.md) | Catálogo expuesto como tool (`createTool`) |
| [US-011](../stories/US-011-pipeline-respuesta/index.md) | [stories/US-011-mastra](./stories/US-011-pipeline-respuesta.mastra.md) | Webhook → workflow Mastra → agente → Evolution/Chatwoot |
| [US-012](../stories/US-012-handoff-humano/index.md) | [stories/US-012-mastra](./stories/US-012-handoff-humano.mastra.md) | Handoff con estados propios + human-in-the-loop de workflows |
| [US-013](../stories/US-013-memoria-cliente/index.md) | [stories/US-013-mastra](./stories/US-013-memoria-cliente.mastra.md) | Perfil por contacto con working memory por `resource` |

## Trade-offs globales (Mastra vs. implementación propia)

**A favor**: RAG, memoria, workflows durables, retries e idempotencia de steps ya resueltos; Studio para probar agentes sin UI propia; observabilidad de LLM incluida; encaja con el stack (TS, Hono adapter, Postgres, auth Clerk soportada).

**En contra**: dependencia de un framework joven (v1); el modelo threads/resources hay que mapearlo a nuestro dominio (contacto/conversación); los límites free de Platform obligan a mantener datos en nuestro Postgres y a muestrear telemetría; curva de aprendizaje de workflows/processors.
