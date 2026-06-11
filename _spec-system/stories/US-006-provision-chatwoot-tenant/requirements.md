---
id: US-006
---

# Requirements Document

## Introduction

Cada tenant necesita su propio espacio en Chatwoot sin pasos manuales. Esta historia automatiza la creación de la cuenta, el inbox del bot y el acceso de los agentes del tenant, dejando los identificadores persistidos para la sincronización de mensajes (US-007).

## Glossary

| Término | Definición |
|---|---|
| Cuenta Chatwoot | Espacio aislado en Chatwoot; 1 tenant = 1 cuenta. |
| Inbox API | Canal de tipo API en Chatwoot que recibe/emite mensajes vía REST y webhooks; 1 bot = 1 inbox. |
| Agente | Usuario de Chatwoot con acceso a la cuenta del tenant para atender conversaciones. |
| Provisión | Creación idempotente de cuenta + inbox + agentes vía API de plataforma de Chatwoot. |

## Requirements

### Requirement 1: Cuenta por tenant

**User Story:** Como plataforma, quiero crear una cuenta de Chatwoot por tenant, para aislar la atención de cada cliente.

#### Acceptance Criteria

1. WHEN un tenant activa su primer bot THE backend SHALL crear una cuenta de Chatwoot y persistir `chatwootAccountId` en el tenant.
2. IF el tenant ya tiene cuenta THEN THE backend SHALL reutilizarla sin crear duplicados.
3. IF la creación de la cuenta falla THEN THE backend SHALL abortar la provisión y reportar el error sin dejar estado parcial persistido.

### Requirement 2: Inbox por bot

**User Story:** Como admin de tenant, quiero un inbox por bot, para separar las conversaciones de cada número.

#### Acceptance Criteria

1. WHEN se provisiona un bot con cuenta existente THE backend SHALL crear un inbox API con webhook apuntando al backend y persistir `chatwootInboxId` en el bot.
2. IF el bot ya tiene `chatwootInboxId` THEN THE backend SHALL omitir la creación.
3. WHEN se elimina un bot THE backend SHALL conservar el inbox y sus conversaciones (solo desvincular).

### Requirement 3: Acceso de agentes

**User Story:** Como miembro de tenant, quiero acceder al Chatwoot de mi organización, para atender conversaciones.

#### Acceptance Criteria

1. WHEN un admin solicita el alta de un miembro como agente THE backend SHALL crear (o reusar) el usuario en Chatwoot y asociarlo a la cuenta del tenant.
2. WHEN el alta termina THE frontend SHALL mostrar la URL de acceso al Chatwoot del tenant.
3. IF el usuario ya es agente de la cuenta THEN THE backend SHALL responder éxito idempotente.

### Requirement 4: Idempotencia de la provisión

**User Story:** Como plataforma, quiero que la provisión sea re-ejecutable, para recuperarme de fallos parciales.

#### Acceptance Criteria

1. WHEN la provisión se ejecuta dos veces para el mismo bot THE backend SHALL producir exactamente una cuenta y un inbox.
2. IF un paso intermedio falló previamente THEN THE backend SHALL reanudar desde el paso faltante al reintentar.
