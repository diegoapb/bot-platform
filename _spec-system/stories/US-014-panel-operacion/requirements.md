---
id: US-014
---

# Requirements Document

## Introduction

Sin visibilidad no hay confianza en el bot. Esta historia entrega el panel operativo del tenant (conversaciones, métricas, trazas de LLM) y deja el MVP corriendo en producción sobre Dokploy con dominios y webhooks estables.

## Glossary

| Término | Definición |
|---|---|
| Panel | Vista del dashboard con conversaciones, métricas y trazas del tenant. |
| Traza | Registro de una generación del LLM (tabla `generations` de US-011). |
| Healthcheck | Endpoint que reporta el estado del backend y sus dependencias. |
| Despliegue MVP | Backend + frontend en Dokploy con env de producción y dominios públicos. |

## Requirements

### Requirement 1: Panel de conversaciones

**User Story:** Como member de tenant, quiero ver las conversaciones de mis bots con su estado, para saber dónde intervenir.

#### Acceptance Criteria

1. WHEN un usuario abre el panel THE sistema SHALL listar las conversaciones del tenant con contacto, modo, último mensaje y fecha, ordenadas por actividad reciente.
2. WHEN un usuario abre una conversación THE sistema SHALL mostrar el historial de mensajes con su origen (cliente, bot, agente).
3. WHEN un usuario con permiso cambia el modo de la conversación THE sistema SHALL aplicar el cambio usando las transiciones de US-012.
4. WHILE el panel esté abierto, THE sistema SHALL refrescar la lista al menos cada 10 segundos.

### Requirement 2: Métricas del tenant

**User Story:** Como admin de tenant, quiero métricas básicas de mi operación, para medir el valor del bot.

#### Acceptance Criteria

1. WHEN un admin abre las métricas THE sistema SHALL mostrar, para el rango elegido (7/30 días): mensajes entrantes, respuestas del bot, handoffs y conversaciones únicas.
2. WHILE existan datos de varios tenants, THE sistema SHALL calcular métricas solo del tenant autenticado.

### Requirement 3: Trazas de generaciones

**User Story:** Como admin de tenant, quiero inspeccionar qué respondió el LLM y por qué, para auditar calidad y costos.

#### Acceptance Criteria

1. WHEN un admin abre las trazas de un bot THE sistema SHALL listar las generaciones con fecha, conversación, tokens, latencia y estado (éxito/error).
2. WHEN un admin abre una traza THE sistema SHALL mostrar el prompt y la respuesta completos.
3. WHILE el usuario sea super admin de plataforma, THE sistema SHALL permitir ver trazas de cualquier tenant desde `/admin`.

### Requirement 4: Despliegue productivo

**User Story:** Como equipo Woofly, quiero el MVP en producción, para validarlo con clientes reales.

#### Acceptance Criteria

1. WHEN se despliega la aplicación en Dokploy THE sistema SHALL exponer frontend y backend bajo dominios públicos con TLS.
2. WHEN Evolution o Chatwoot envían webhooks a producción THE backend SHALL recibirlos en URLs estables configuradas en la provisión.
3. WHEN se consulta el healthcheck THE backend SHALL reportar el estado de DB, Evolution y Chatwoot.
4. IF una dependencia crítica no responde THEN THE healthcheck SHALL reflejarlo con estado degradado.
