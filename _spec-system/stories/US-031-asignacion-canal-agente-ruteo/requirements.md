---
id: US-031
---

# Requirements Document

## Introduction

Hoy cada canal cuelga rígidamente de un bot (ruteo hardcodeado: una instancia de Evolution o un inbox de Chatwoot → un bot). Tras renombrar el bot a agente (US-030), esta historia desacopla el canal del agente mediante una relación N:M y reescribe el ruteo de inbound para que opere sobre el agente resuelto por el canal. El valor es operativo: un único agente —con una sola identidad, modelo y conocimiento— puede atender simultáneamente varios canales (WhatsApp, Instagram, Telegram). En esta fase la relación se restringe a un agente por canal; la estructura N:M y el ruteo por reglas se habilitan en E14. La conversación registra y fija el agente al crearse, garantizando que no cambie en caliente.

## Glossary

| Término | Definición |
|---|---|
| Agente | Entidad que sustituye al bot: posee identidad, prompt y modelo propios. Aislado por tenant. |
| Canal | Transporte de mensajería (WhatsApp vía Evolution, Telegram, WhatsApp Cloud, Instagram, Messenger). Cada canal nativo es un inbox de Chatwoot. |
| Canal legacy WhatsApp/Evolution | El transporte WhatsApp que hoy vive en columnas de la tabla de agentes (ex-`bots`) en lugar de en la tabla de canales. |
| Enlace canal-agente | Fila de `agent_channels` que asocia un canal a un agente. En esta fase, único por canal. |
| Inbound | Mensaje entrante de un cliente recibido por webhook (instancia de Evolution o inbox de Chatwoot). |
| Ruteo de inbound | Proceso que, ante un mensaje entrante, determina a qué agente corresponde a partir del canal de origen. |
| Agente fijado | El agente resuelto al inicio de la conversación y persistido en la conversación; no cambia mientras la conversación viva. |

## Requirements

### Requirement 1: Asignar un canal a un agente

**User Story:** Como admin de tenant, quiero asignar un canal a un agente, para que ese agente atienda los mensajes de ese canal.

#### Acceptance Criteria

1. WHEN un admin asigna un canal libre a un agente del mismo tenant THE backend SHALL crear el enlace canal-agente.
2. IF el canal ya está asignado a otro agente THEN THE backend SHALL rechazar la asignación indicando que el canal ya tiene agente.
3. IF el canal y el agente pertenecen a tenants distintos THEN THE backend SHALL rechazar la asignación.
4. WHEN un admin reasigna un canal ya asignado al mismo agente THE backend SHALL dejar el enlace existente sin crear duplicados.
5. IF el agente o el canal referenciado no existe THEN THE backend SHALL rechazar la asignación indicando el recurso ausente.

### Requirement 2: Invariante un-canal-un-agente en fase 1

**User Story:** Como plataforma, quiero garantizar que en esta fase cada canal pertenezca a lo sumo a un agente, para que el ruteo de inbound sea determinístico.

#### Acceptance Criteria

1. WHILE exista un enlace para un canal, THE backend SHALL impedir crear un segundo enlace para ese mismo canal.
2. WHEN se consultan los canales de un agente THE backend SHALL devolver únicamente canales enlazados a ese agente.
3. WHEN se consulta el agente de un canal THE backend SHALL devolver a lo sumo un agente.

### Requirement 3: Desasignar un canal de un agente

**User Story:** Como admin de tenant, quiero desasignar un canal de un agente, para reorganizar qué agente atiende qué canal.

#### Acceptance Criteria

1. WHEN un admin desasigna un canal de su agente THE backend SHALL eliminar el enlace canal-agente.
2. WHEN un canal queda desasignado THE backend SHALL permitir asignarlo a otro agente del mismo tenant.
3. IF llega un inbound por un canal sin agente enlazado THEN THE backend SHALL registrar el evento y no generar respuesta automática.
4. WHILE existan conversaciones ya creadas para un canal recién desasignado, THE backend SHALL conservar el agente fijado en esas conversaciones.

### Requirement 4: Ruteo de inbound resuelve el agente por el canal

**User Story:** Como plataforma, quiero que cada mensaje entrante se atribuya al agente del canal por el que llega, para que el motor responda con el cerebro correcto.

#### Acceptance Criteria

1. WHEN llega un inbound por un inbox de Chatwoot THE backend SHALL resolver el canal correspondiente y, a partir de él, el agente enlazado.
2. WHEN llega un inbound por una instancia de Evolution THE backend SHALL resolver el canal legacy WhatsApp/Evolution y, a partir de él, el agente enlazado.
3. WHEN el agente queda resuelto THE motor de respuesta SHALL ejecutar el pipeline (sincronización de mensajes, contexto, conocimiento, identidad) usando ese agente.
4. IF un inbound llega por un canal sin agente enlazado THEN THE backend SHALL descartar el procesamiento del motor sin error visible para el remitente.
5. WHILE se procesa un inbound, THE backend SHALL atribuir el procesamiento al tenant dueño del agente resuelto.

### Requirement 5: La conversación registra y fija el agente

**User Story:** Como plataforma, quiero que la conversación recuerde con qué agente nació, para que el agente no cambie en caliente durante esa conversación.

#### Acceptance Criteria

1. WHEN se crea una conversación a partir de un inbound THE backend SHALL persistir en la conversación el agente resuelto.
2. WHILE una conversación esté viva, THE backend SHALL usar el agente fijado en ella para cada mensaje, aunque el enlace del canal cambie.
3. IF el canal se reasigna a otro agente después de crear la conversación THEN THE backend SHALL mantener el agente fijado para los mensajes de esa conversación.
4. WHEN se crea una conversación nueva por el mismo canal tras una reasignación THE backend SHALL fijar el agente vigente del canal en ese momento.

### Requirement 6: Un agente atiende el inbound de todos sus canales

**User Story:** Como admin de tenant, quiero que un agente con varios canales atienda a todos por igual, para ofrecer una experiencia unificada multicanal.

#### Acceptance Criteria

1. WHEN un agente tiene varios canales enlazados THE backend SHALL enrutar el inbound de cualquiera de esos canales al mismo agente.
2. WHEN el motor responde a un inbound THE backend SHALL aplicar la identidad y el modelo propios del agente, con independencia del canal de origen.
3. WHILE un agente atienda varios canales, THE backend SHALL mantener separado el estado de conversación por canal.

### Requirement 7: Migración del canal legacy y aislamiento por tenant

**User Story:** Como plataforma, quiero migrar el transporte WhatsApp/Evolution al modelo de canales y enlazarlo a su agente, para que todo el ruteo opere de forma uniforme y aislada por tenant.

#### Acceptance Criteria

1. WHEN se ejecuta la migración THE backend SHALL representar cada transporte WhatsApp/Evolution existente como un canal y enlazarlo a su agente con un enlace canal-agente.
2. WHEN se ejecuta la migración dos veces THE backend SHALL producir el mismo resultado sin crear enlaces ni canales duplicados.
3. WHEN la migración termina THE backend SHALL dejar cada canal preexistente enlazado a exactamente un agente sin pérdida de conversaciones ni mensajes.
4. WHILE se resuelve o consulta cualquier enlace, canal o agente, THE backend SHALL operar únicamente sobre datos del tenant en contexto.
