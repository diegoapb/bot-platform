---
id: US-005
---

# Requirements Document

## Introduction

Un tenant necesita conectar su número de WhatsApp sin tocar Evolution API directamente. Esta historia cubre la creación de la instancia, la vinculación por QR, el seguimiento del estado de conexión y la recepción base de eventos vía webhook. Sin esto no entra ningún mensaje a la plataforma.

## Glossary

| Término | Definición |
|---|---|
| Instancia | Sesión de WhatsApp en Evolution API; 1 bot = 1 instancia con nombre único derivado del bot. |
| Vinculación | Proceso de escanear el QR desde la app de WhatsApp para asociar el teléfono a la instancia. |
| Estado de conexión | Valor `disconnected \| qr \| connected` que refleja la sesión de la instancia. |
| Webhook | Endpoint público del backend que recibe eventos de Evolution (conexión, QR, mensajes). |

## Requirements

### Requirement 1: Creación de instancia

**User Story:** Como admin de tenant, quiero que al iniciar la conexión se cree la instancia de WhatsApp de mi bot, para no gestionar Evolution manualmente.

#### Acceptance Criteria

1. WHEN un `org:admin` inicia la conexión de un bot sin instancia THE backend SHALL crear una instancia en Evolution con nombre único derivado del bot y persistir la referencia en el bot.
2. IF el bot ya tiene instancia activa THEN THE backend SHALL reutilizarla en lugar de crear una nueva.
3. IF la creación en Evolution falla THEN THE backend SHALL responder con error descriptivo y no persistir referencia alguna.
4. WHEN un usuario sin rol `org:admin` intenta iniciar la conexión THE backend SHALL rechazar la operación.

### Requirement 2: Vinculación por QR

**User Story:** Como admin de tenant, quiero ver el QR de vinculación en el dashboard, para conectar mi teléfono en segundos.

#### Acceptance Criteria

1. WHEN la instancia está creada y sin vincular THE frontend SHALL mostrar el QR vigente de la instancia.
2. WHILE el QR esté visible y no escaneado, THE frontend SHALL refrescarlo antes de su expiración.
3. WHEN el teléfono escanea el QR THE backend SHALL registrar el estado `connected` y THE frontend SHALL reflejarlo sin recargar la página.
4. IF la vinculación no ocurre en 5 minutos THEN THE frontend SHALL detener el refresco y ofrecer reintentar.

### Requirement 3: Estado de conexión observable

**User Story:** Como admin de tenant, quiero ver en todo momento si mi número está conectado, para confiar en que el canal funciona.

#### Acceptance Criteria

1. WHEN Evolution emite un cambio de estado de la instancia THE backend SHALL persistir el nuevo estado con marca de tiempo.
2. WHEN el teléfono se desvincula externamente THE dashboard SHALL mostrar `disconnected` en menos de 30 segundos.
3. WHEN un admin solicita desconectar el número THE backend SHALL cerrar la sesión en Evolution y persistir `disconnected`.

### Requirement 4: Webhook base de eventos

**User Story:** Como plataforma, quiero recibir los eventos de Evolution en un endpoint propio, para alimentar los flujos de conexión y, después, de mensajes.

#### Acceptance Criteria

1. WHEN Evolution envía un evento al webhook THE backend SHALL validar el token compartido antes de procesarlo.
2. IF el token es inválido o falta THEN THE backend SHALL rechazar el evento sin efectos secundarios.
3. WHEN llega un evento de una instancia conocida THE backend SHALL resolver el `tenantId` y el `botId` asociados antes de procesar.
4. IF llega un evento de una instancia desconocida THEN THE backend SHALL descartarlo y registrar el hecho.
