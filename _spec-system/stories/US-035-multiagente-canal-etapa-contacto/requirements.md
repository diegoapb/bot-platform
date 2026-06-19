---
id: US-035
---

# Requirements Document

## Introduction

En la Fase 1 (E13) un canal se enlaza a exactamente un agente. Para soportar el escenario guia de E14 —un cliente en post-venta y otro en pre-venta escribiendo por el mismo canal, atendidos por agentes distintos— hace falta que un canal pueda tener varios agentes candidatos, un agente por defecto y que cada contacto lleve una etapa que mas adelante decidira el ruteo. Esta historia construye solo ese cimiento de datos y sus operaciones de lectura/escritura, con auditoria de los cambios de etapa y aislamiento por tenant. El motor de reglas, el orquestador, la resolucion/fijacion del agente y la UI quedan fuera (US-036 a US-039).

## Glossary

| Término | Definición |
|---|---|
| Agente | Entidad `agents`: identidad/prompt + modelo + conocimiento enlazado. El "cerebro" que atiende. |
| Canal | Entidad `channels`: transporte de mensajes (Telegram, WhatsApp Cloud, Instagram, Messenger; WhatsApp/Evolution legacy). |
| Agente candidato | Agente enlazado a un canal vía `agent_channels`; elegible para atender clientes de ese canal. |
| Agente por defecto | Agente del canal (`channels.default_agent_id`) que actuará como fallback final del ruteo en historias posteriores. |
| Contacto | Entidad `contacts`: identidad unificada del cliente por agente (telefono/email), introducida en E13. |
| Etapa | Segmento del ciclo de vida del contacto (`contacts.stage`): p.ej. `pre_sale`, `post_sale`. |
| Label de Chatwoot | Etiqueta aplicada a una conversacion/contacto en Chatwoot, usada como fuente de sincronizacion de etapa. |
| Tenant | Organización de Clerk (`tenantId` = org id). Frontera de aislamiento de todos los datos. |

## Requirements

### Requirement 1: Asignar y quitar agentes candidatos de un canal

**User Story:** Como admin de tenant, quiero asignar y quitar varios agentes candidatos a un canal, para que distintos clientes del canal puedan ser atendidos por agentes distintos.

#### Acceptance Criteria

1. WHEN un admin asigna un agente del tenant a un canal del tenant THE backend SHALL registrar al agente como candidato de ese canal.
2. WHEN un admin asigna varios agentes distintos al mismo canal THE backend SHALL aceptarlos todos como candidatos del canal.
3. IF el admin asigna un agente que ya es candidato del canal THEN THE backend SHALL rechazar la operación indicando que el enlace ya existe.
4. IF el admin asigna un agente o un canal que pertenece a otro tenant THEN THE backend SHALL rechazar la operación.
5. WHEN un admin quita un agente candidato de un canal THE backend SHALL eliminar únicamente ese enlace agente-canal.
6. WHEN un admin lista los agentes candidatos de un canal THE backend SHALL devolver todos los agentes enlazados a ese canal y ninguno de otro canal o tenant.

### Requirement 2: Agente por defecto del canal

**User Story:** Como admin de tenant, quiero definir un agente por defecto del canal, para que exista un fallback final cuando ninguna regla decida qué agente atiende.

#### Acceptance Criteria

1. WHEN un admin define el agente por defecto de un canal con un agente candidato del mismo canal THE backend SHALL persistir ese agente como agente por defecto del canal.
2. IF el admin define como agente por defecto un agente que no es candidato del canal THEN THE backend SHALL rechazar la operación.
3. IF el admin define como agente por defecto un agente de otro tenant THEN THE backend SHALL rechazar la operación.
4. WHEN un admin quita el agente candidato que es el agente por defecto del canal THE backend SHALL impedir la operación mientras siga siendo el agente por defecto.
5. WHEN un admin consulta un canal THE backend SHALL exponer cuál es su agente por defecto, o ausencia de él si no se ha definido.

### Requirement 3: Lectura y escritura de la etapa del contacto

**User Story:** Como admin de tenant, quiero leer y fijar manualmente la etapa de un contacto, para clasificar a cada cliente en su momento del ciclo de vida.

#### Acceptance Criteria

1. WHEN un admin fija la etapa de un contacto del tenant a un valor de etapa válido THE backend SHALL persistir esa etapa en el contacto.
2. WHEN un admin consulta un contacto THE backend SHALL devolver su etapa actual, o ausencia de etapa si nunca se ha fijado.
3. IF el admin fija una etapa con un valor que no pertenece al conjunto de etapas permitido THEN THE backend SHALL rechazar la operación.
4. IF el admin fija o consulta la etapa de un contacto de otro tenant THEN THE backend SHALL rechazar la operación.
5. WHEN un admin vuelve a fijar la etapa de un contacto al mismo valor que ya tiene THE backend SHALL dejar la etapa sin cambios y no registrar una transición nueva.

### Requirement 4: Auditoría de cambios de etapa

**User Story:** Como admin de tenant, quiero un historial de los cambios de etapa de un contacto, para saber quién o qué cambió la etapa y cuándo.

#### Acceptance Criteria

1. WHEN la etapa de un contacto cambia de un valor a otro distinto THE backend SHALL registrar una transición con la etapa anterior, la nueva, la causa y el momento.
2. WHEN el cambio de etapa lo origina un admin THE backend SHALL registrar al actor que lo originó.
3. WHEN el cambio de etapa lo origina una sincronización automática THE backend SHALL registrar la causa como sincronización y dejar el actor vacío.
4. WHEN un admin consulta el historial de etapas de un contacto THE backend SHALL devolver las transiciones de ese contacto ordenadas de la más reciente a la más antigua.

### Requirement 5: Sincronización de etapa desde label de Chatwoot

**User Story:** Como admin de tenant, quiero que la etapa del contacto se sincronice desde los labels de Chatwoot, para no tener que mantener la etapa a mano cuando el equipo ya la marca en Chatwoot.

#### Acceptance Criteria

1. WHEN llega un evento de Chatwoot que asocia a un contacto un label mapeado a una etapa THE backend SHALL fijar esa etapa en el contacto.
2. IF el label recibido no está mapeado a ninguna etapa THEN THE backend SHALL ignorarlo sin alterar la etapa del contacto.
3. IF un admin ya fijó manualmente la etapa de un contacto THEN THE backend SHALL ignorar la sincronización por label para ese contacto y conservar la etapa manual.
4. WHEN un evento de Chatwoot referencia un contacto inexistente para el tenant THE backend SHALL ignorar el evento sin crear contacto ni etapa.
5. WHEN el mismo evento de label se procesa más de una vez THE backend SHALL dejar la etapa del contacto en el mismo valor final sin registrar transiciones adicionales.
