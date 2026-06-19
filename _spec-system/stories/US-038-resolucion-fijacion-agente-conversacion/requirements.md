---
id: US-038
---

# Requirements Document

## Introduction

US-035 dio a cada canal varios agentes candidatos y un agente por defecto; US-036 construyo el motor de reglas determinista; US-037 anade el orquestador (router LLM) como respaldo. Falta el eslabon que, cuando entra el primer mensaje de un cliente y nace una conversacion, decide cual de esos agentes la atiende, lo fija para toda la vida de esa conversacion y deja registro de por que. Esta historia define el resolver de ruteo que encadena reglas -> orquestador -> agente por defecto, persiste el agente resuelto en la conversacion al crearla, garantiza que ese agente no cambie en caliente, re-resuelve cuando se abre una conversacion nueva tras un cierre, registra la causa del ruteo para auditoria y es robusto e idempotente ante reentradas del webhook. Quedan fuera la definicion de las reglas (US-036), del orquestador (US-037), del modelo multi-agente/etapa (US-035) y la UI (US-039).

## Glossary

| Término | Definición |
|---|---|
| Agente | Entidad `agents`: identidad/prompt + modelo + conocimiento enlazado. El "cerebro" que atiende una conversacion. |
| Canal | Entidad `channels`: transporte de mensajes de un tenant (WhatsApp, Telegram, etc.). |
| Contacto | Entidad `contacts`: identidad unificada del cliente por agente (telefono/email), con su `stage` (etapa). |
| Conversacion | Entidad `conversations`: hilo de atencion vivo de un contacto en un canal; tiene un `mode` y, tras esta historia, un agente fijado. |
| Resolver de ruteo | Operacion que decide el agente de una conversacion encadenando reglas -> orquestador -> agente por defecto. |
| Regla de ruteo | Decision determinista del motor de US-036 (`routing_rules`): primera regla habilitada que matchea por prioridad ascendente. |
| Orquestador | Router LLM de US-037 que elige un agente entre los candidatos del canal cuando ninguna regla matchea. |
| Agente por defecto | `channels.default_agent_id`: agente candidato del canal usado como respaldo final del resolver. |
| Causa del ruteo | Origen de la decision: la regla (`rule`), el orquestador (`orchestrator`) o el defecto (`default`), con el identificador de lo que decidio. |
| Fijacion | Persistencia del agente resuelto en la conversacion al crearla; no se re-evalua mientras la conversacion viva. |
| Cambio en caliente | Reasignar el agente de una conversacion ya viva. Explicitamente prohibido (D3). |
| Re-resolucion | Volver a ejecutar el resolver al nacer una conversacion nueva (tras cierre de la anterior); puede dar un agente distinto. |
| Reentrada del webhook | Llegada repetida del mismo evento de mensaje entrante; debe tratarse de forma idempotente. |
| Tenant | Organizacion de Clerk (`tenantId` = org id). Frontera de aislamiento de todos los datos. |

## Requirements

### Requirement 1: Resolucion encadenada al inicio de la conversacion

**User Story:** Como plataforma, quiero resolver el agente al nacer una conversacion encadenando reglas, orquestador y agente por defecto, para asignar siempre el agente correcto.

#### Acceptance Criteria

1. WHEN nace una conversacion nueva en un canal para un contacto THE resolver SHALL evaluar primero las reglas de ruteo del canal sobre el contacto.
2. IF una regla de ruteo decide un agente THEN THE resolver SHALL adoptar ese agente como resuelto y SHALL omitir el orquestador y el agente por defecto.
3. IF ninguna regla de ruteo decide un agente THEN THE resolver SHALL invocar al orquestador del canal sobre el contacto.
4. IF el orquestador decide un agente THEN THE resolver SHALL adoptar ese agente como resuelto y SHALL omitir el agente por defecto.
5. IF ni las reglas ni el orquestador deciden un agente THEN THE resolver SHALL adoptar el agente por defecto del canal como resuelto.
6. WHEN el resolver adopta un agente resuelto THE resolver SHALL devolver un agente que sea candidato del canal en ese momento.

### Requirement 2: Fijacion del agente en la conversacion

**User Story:** Como plataforma, quiero grabar el agente resuelto en la conversacion al crearla, para que el resto del sistema sepa quien atiende sin volver a resolver.

#### Acceptance Criteria

1. WHEN se crea una conversacion nueva THE backend SHALL persistir el agente resuelto en esa conversacion antes de procesar el primer mensaje.
2. WHILE una conversacion siga viva, THE backend SHALL conservar el mismo agente fijado para todos sus mensajes.
3. WHEN una conversacion ya tiene un agente fijado y llega un mensaje posterior THE backend SHALL usar el agente fijado y SHALL omitir el resolver.
4. IF se intenta cambiar el agente de una conversacion ya viva THEN THE backend SHALL rechazar el cambio.

### Requirement 3: Re-resolucion en conversacion nueva

**User Story:** Como plataforma, quiero re-resolver el agente cuando un contacto inicia una conversacion nueva tras cerrar la anterior, para que su agente refleje su etapa actual.

#### Acceptance Criteria

1. WHEN un contacto inicia una conversacion nueva despues de que su conversacion anterior quedo cerrada THE resolver SHALL ejecutarse de nuevo para esa conversacion nueva.
2. IF los datos del contacto cambiaron desde la conversacion anterior y por ello las reglas deciden otro agente THEN THE backend SHALL fijar el agente nuevo en la conversacion nueva.
3. WHILE coexistan la conversacion cerrada y la conversacion nueva, THE backend SHALL conservar intacto el agente fijado de la conversacion cerrada.

### Requirement 4: Pipeline de inbound con el agente fijado

**User Story:** Como motor conversacional, quiero usar el agente fijado de la conversacion para identidad, conocimiento y generacion, para responder con el cerebro correcto.

#### Acceptance Criteria

1. WHEN el pipeline de inbound procesa un mensaje de una conversacion THE pipeline SHALL usar el agente fijado de esa conversacion para construir la identidad del agente.
2. WHEN el pipeline recupera conocimiento para responder THE pipeline SHALL recuperar unicamente conocimiento de las colecciones enlazadas al agente fijado.
3. WHEN el pipeline genera la respuesta THE pipeline SHALL atribuir la generacion al agente fijado de la conversacion.

### Requirement 5: Registro de la causa del ruteo

**User Story:** Como admin de tenant, quiero ver por que se asigno cada agente, para auditar y depurar el ruteo.

#### Acceptance Criteria

1. WHEN el resolver fija un agente en una conversacion THE backend SHALL registrar la causa del ruteo indicando si decidio una regla, el orquestador o el agente por defecto.
2. IF la decision provino de una regla THEN THE backend SHALL registrar el identificador de la regla que decidio.
3. IF la decision provino del orquestador THEN THE backend SHALL registrar que decidio el orquestador.
4. IF la decision provino del agente por defecto THEN THE backend SHALL registrar que se uso el agente por defecto.
5. WHEN un admin consulta el ruteo de una conversacion THE backend SHALL exponer el agente fijado y la causa registrada.

### Requirement 6: Robustez del fallback

**User Story:** Como plataforma, quiero que el resolver siempre fije un agente atendible aunque fallen las reglas o el orquestador, para no dejar al cliente sin atencion.

#### Acceptance Criteria

1. IF el orquestador falla o no devuelve un agente valido THEN THE resolver SHALL recurrir al agente por defecto del canal.
2. IF el agente decidido por una regla o por el orquestador ya no es candidato del canal THEN THE resolver SHALL descartarlo y SHALL continuar con el siguiente eslabon de la cadena.
3. IF el canal no tiene agente por defecto y ningun eslabon decide un agente candidato THEN THE resolver SHALL rechazar la creacion de la conversacion indicando que no hay agente atendible.
4. WHEN el resolver recurre al agente por defecto por fallo de un eslabon previo THE backend SHALL registrar la causa real con la que se fijo el agente.

### Requirement 7: Idempotencia ante reentradas del webhook

**User Story:** Como plataforma, quiero que la resolucion y fijacion sean idempotentes ante eventos repetidos, para no duplicar conversaciones ni reasignar el agente.

#### Acceptance Criteria

1. WHEN llega mas de una vez el evento que crea la primera conversacion de un contacto en un canal THE backend SHALL crear a lo sumo una conversacion para ese contacto y canal.
2. IF dos eventos concurrentes intentan crear la primera conversacion del mismo contacto en el mismo canal THEN THE backend SHALL fijar el agente una sola vez y SHALL reutilizar la conversacion ya creada para el otro evento.
3. WHEN se reprocesa un evento de una conversacion que ya tiene agente fijado THE backend SHALL conservar el agente fijado sin re-resolver.
4. WHEN se reprocesa un evento que ya fijo un agente THE backend SHALL registrar a lo sumo una causa de ruteo para esa conversacion.
