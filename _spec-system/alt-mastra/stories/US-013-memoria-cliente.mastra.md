---
id: US-013-M
variant-of: US-013
title: Memoria por contacto con Memory de Mastra
epic: E07-M
status: draft
priority: P1
estimate: S  # baja de M→S: working memory + persistencia las da el framework
owner: @diego
---

# US-013-M · Memoria por contacto con Memory de Mastra

**Como** cliente final recurrente, **quiero** que el bot recuerde quién soy y qué hemos hablado, **para** no repetir mi contexto en cada conversación.

> Equivale a [US-013](../../stories/US-013-memoria-cliente/index.md). Mismos criterios; el perfil artesanal se sustituye por Memory de Mastra con storage propio.

## Qué cambia respecto al original

| Original | Con Mastra |
| --- | --- |
| Tabla de perfil + hechos clave-valor propios | **Working Memory** scope `resource` con schema Zod |
| Job propio de extracción de hechos | El agente actualiza working memory durante la conversación (built-in) |
| Rolling summary al cerrar conversación (código propio) | Observational memory/summarization de Mastra, o step de cierre del workflow como fallback |
| Inyección manual de memoria al prompt | Automática al pasar `{ resource, thread }` en `agent.generate()` |

## Diseño (resumen)

1. **Configuración**:
   ```ts
   const memory = new Memory({
     storage: new PostgresStore({ connectionString }), // Postgres Dokploy, NO Memory Gateway
     options: {
       workingMemory: { enabled: true, scope: "resource", schema: contactProfileSchema },
       lastMessages: 10,
     },
   });
   ```
2. **Claves**: `resource = ${tenantId}:${botId}:${e164Phone}` (teléfono normalizado, igual que el original); `thread = conversationId`. El namespacing del resource garantiza el aislamiento tenant/bot por construcción.
3. **Schema del perfil** (`contactProfileSchema`): nombre, idioma, preferencias, contexto de negocio, notas — acotado para controlar tokens.
4. **Resumen del historial**: al marcar conversación cerrada/inactiva (job o webhook de Chatwoot), step que condensa el thread en el campo `resumen` de la working memory (si la summarization automática de Mastra no basta).
5. **Dashboard**: vista por contacto que lee/edita la working memory vía API de Memory; ediciones del admin son fuente de verdad (sobrescriben).

## Free tier

- **Clave**: storage propio ⇒ no aplican los 100K memory tokens/mes ni la retención de threads de 15 días del Memory Gateway. Con Gateway free, un cliente que vuelve al mes ya sería *stale* — rompería el objetivo de la épica.
- Costo real: tokens extra por turno (working memory en el prompt), BYOK. Mitigar con schema acotado + `lastMessages` bajo.

## Criterios de aceptación

- [ ] Segunda conversación (nuevo thread, mismo resource): el bot usa datos de la primera (p. ej. saluda por nombre), incluso semanas después.
- [ ] La memoria del contacto es visible y editable desde el dashboard; la edición se refleja en la siguiente respuesta.
- [ ] Mismo teléfono en dos tenants/bots ⇒ dos resources ⇒ memorias independientes (test de aislamiento).
- [ ] Al cerrar una conversación se actualiza el resumen del contacto.
