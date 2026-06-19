---
id: US-030
---

# Requirements Document

## Introduction

Hoy la entidad `bot` es a la vez el cerebro (identidad, configuracion, conocimiento) y el dueño del transporte (instancia de Evolution, inbox de Chatwoot). Esta historia separa el cerebro creando una entidad **Agente** propia y aislada por tenant, y migra de forma automatica e idempotente cada bot existente a exactamente un agente, sin perder ni duplicar datos. La identidad del agente (SOUL/IDENTITY/GUARDRAILS) pasa a colgar del agente, y cada agente puede definir su modelo LLM efectivo (o heredar el global). Tras la migracion, todas las conversaciones y flujos existentes deben seguir funcionando: el bot continua siendo, por ahora, el contenedor del transporte legacy.

## Glossary

| Término | Definición |
|---|---|
| Agente | Entidad propia que representa el "cerebro": nombre, estado, modelo LLM, configuracion de extraccion, lista blanca y mensaje de handoff. Independiente del transporte. |
| Bot (legacy) | Entidad actual que fusiona cerebro y transporte. Tras la migracion conserva solo el rol de transporte legacy (Evolution/Chatwoot). |
| Tenant | Organizacion de Clerk dueña de los datos. Todo agente pertenece a exactamente un tenant y nunca se comparte entre tenants. |
| Identidad | Conjunto de documentos versionados de tipo SOUL, IDENTITY y GUARDRAILS que definen el prompt de sistema del agente. Append-only; la version vigente es la de mayor numero por (sujeto, tipo). |
| Modelo efectivo | Modelo LLM que finalmente se usa al generar para un agente: el propio del agente si esta definido, o el modelo global de la plataforma si no lo esta. |
| Modelo global | Modelo LLM por defecto de la plataforma, configurado a nivel de entorno. |
| Migracion idempotente | Proceso que, ejecutado una o varias veces, deja el mismo estado final: un agente por bot, sin duplicar agentes ni documentos de identidad. |

## Requirements

### Requirement 1: Existencia de la entidad Agente

**User Story:** Como plataforma, quiero una entidad Agente persistida y aislada por tenant, para representar el cerebro de forma independiente del transporte.

#### Acceptance Criteria

1. WHEN se crea un agente THE plataforma SHALL persistirlo con nombre, estado, tenant y autor de creacion.
2. WHEN se crea un agente sin estado explicito THE plataforma SHALL asignarle el estado inicial `draft`.
3. THE plataforma SHALL aceptar para un agente unicamente los estados `draft`, `active` o `paused`.
4. WHEN se consultan agentes en el contexto de un tenant THE plataforma SHALL devolver solo los agentes de ese tenant.
5. IF se intenta acceder a un agente de otro tenant THEN THE plataforma SHALL rechazar el acceso.

### Requirement 2: Migracion idempotente bot->agente

**User Story:** Como plataforma, quiero migrar automaticamente cada bot existente a un agente, para desacoplar el cerebro sin trabajo manual ni perdida de datos.

#### Acceptance Criteria

1. WHEN se ejecuta la migracion THE plataforma SHALL crear exactamente un agente por cada bot existente.
2. WHEN se crea el agente de un bot THE plataforma SHALL copiar nombre, estado, esquema de extraccion, lista blanca habilitada y mensaje de handoff desde el bot.
3. WHEN se crea el agente de un bot THE plataforma SHALL dejar el modelo del agente sin definir, de modo que use el modelo global.
4. WHEN se crea el agente de un bot THE plataforma SHALL conservar el tenant del bot de origen.
5. IF la migracion se ejecuta de nuevo sobre un bot ya migrado THEN THE plataforma SHALL omitir la creacion de un segundo agente para ese bot.
6. WHILE la migracion esta en curso, THE plataforma SHALL preservar todos los bots existentes sin eliminarlos ni modificar su transporte.

### Requirement 3: Identidad por agente

**User Story:** Como plataforma, quiero que la identidad del agente cuelgue del agente y no del bot, para que el prompt de sistema sea propio del cerebro.

#### Acceptance Criteria

1. WHEN se ejecuta la migracion THE plataforma SHALL re-apuntar cada documento de identidad existente al agente correspondiente a su bot.
2. WHEN se re-apuntan los documentos de identidad de un bot THE plataforma SHALL preservar todas las versiones existentes con su contenido, tipo, autor y orden de version.
3. WHEN se solicita la identidad vigente de un agente THE plataforma SHALL devolver, por cada tipo, el documento de mayor version de ese agente.
4. WHEN se guarda un nuevo documento de identidad de un agente THE plataforma SHALL asignarle una version igual a la maxima existente para ese agente y tipo mas uno.
5. IF dos documentos de identidad pertenecen a agentes distintos THEN THE plataforma SHALL mantener sus versiones independientes entre si.

### Requirement 4: Modelo efectivo por agente

**User Story:** Como plataforma, quiero resolver el modelo LLM por agente, para permitir que un agente use un modelo propio o herede el global.

#### Acceptance Criteria

1. WHEN se resuelve el modelo de un agente con modelo definido THE plataforma SHALL usar el modelo del agente.
2. IF un agente no tiene modelo definido THEN THE plataforma SHALL usar el modelo global de la plataforma.
3. WHEN el motor genera una respuesta para una conversacion THE plataforma SHALL invocar al LLM con el modelo efectivo del agente de esa conversacion.
4. WHEN se registra la traza de una generacion THE plataforma SHALL guardar el modelo efectivo realmente utilizado.

### Requirement 5: Compatibilidad de los flujos existentes

**User Story:** Como operador, quiero que las conversaciones y flujos sigan funcionando tras la migracion, para no interrumpir la atencion.

#### Acceptance Criteria

1. WHEN llega un mensaje a un bot ya migrado THE plataforma SHALL continuar el flujo de respuesta usando el agente resuelto del bot, sin error.
2. WHILE no exista un agente para un bot, THE plataforma SHALL crearlo de forma idempotente antes de procesar su primer mensaje posterior a la migracion.
3. WHEN se compila la identidad para una conversacion THE plataforma SHALL usar la identidad del agente resuelto.
4. IF la migracion no se ha ejecutado para un bot THEN THE plataforma SHALL procesar el mensaje entrante creando el agente del bot de forma idempotente antes de responder.
