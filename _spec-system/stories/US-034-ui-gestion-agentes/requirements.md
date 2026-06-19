---
id: US-034
---

# Requirements Document

## Introduction

El desacople de E13 convierte al agente en una entidad propia con sus canales y colecciones de conocimiento enlazados (N:M). Sin una UI dedicada, ese modelo solo existe en backend y nadie del tenant puede operarlo. Esta historia entrega la administracion visual de agentes: crear y editar agentes, editar su identidad versionada (SOUL/IDENTITY/GUARDRAILS) y su modelo, asignar/quitar canales, enlazar/desenlazar colecciones y ver el conocimiento efectivo resultante, todo bajo permisos admin/member y sin filtrar credenciales de canal. El valor es que un admin administre el nuevo modelo desacoplado de punta a punta sin tocar la base de datos.

## Glossary

| Término | Definición |
|---|---|
| Agente | Entidad "cerebro" propia (US-030): identidad/prompt versionados + modelo + canales y colecciones enlazados. Aislado por tenant. |
| Canal | Transporte de mensajes (Telegram, WhatsApp Cloud, Instagram, Messenger, WhatsApp/Evolution). Se asigna a un agente via enlace N:M (US-031). |
| Coleccion de conocimiento | Unidad reutilizable de conocimiento indexado (US-032); se enlaza a uno o varios agentes (referencia viva). |
| Conocimiento efectivo | Conjunto de colecciones que el agente "ve" hoy: las enlazadas (propias + heredadas), tal como las usaria su recuperacion. |
| Identidad del agente | Documentos versionados append-only por tipo SOUL/IDENTITY/GUARDRAILS; la vigente es la de mayor version por (agente, tipo). |
| Modelo | LLM del agente. Puede ser un modelo concreto o "global por defecto" (hereda `env.LLM_MODEL`). |
| Admin / Member | Roles de Clerk a nivel de organizacion: `org:admin` gestiona todos los agentes del tenant; `org:member` solo los agentes que tiene asignados. |
| Credencial de canal | Secreto del conector (tokens de bot, claves de Meta). Nunca se muestra en la UI. |

## Requirements

### Requirement 1: Listado y acceso a agentes

**User Story:** Como usuario del tenant, quiero ver la lista de agentes que puedo administrar, para entrar a gestionar uno.

#### Acceptance Criteria

1. WHEN un usuario abre la pagina de agentes THE UI SHALL mostrar cada agente visible con su nombre, su estado y la cantidad de canales enlazados.
2. WHILE la lista de agentes se esta cargando, THE UI SHALL mostrar un indicador de carga en lugar de la lista.
3. IF la carga de la lista falla THEN THE UI SHALL mostrar un mensaje de error con accion de reintento.
4. IF el usuario es member THEN THE UI SHALL listar unicamente los agentes asignados a ese usuario.
5. IF el usuario no tiene ningun agente visible THEN THE UI SHALL mostrar un estado vacio explicativo.
6. WHEN el usuario selecciona un agente de la lista THE UI SHALL navegar a la pagina de detalle de ese agente.

### Requirement 2: Creacion de agente

**User Story:** Como admin de tenant, quiero crear un agente nuevo, para incorporarlo al modelo desacoplado.

#### Acceptance Criteria

1. WHILE el usuario es admin, THE UI SHALL mostrar el formulario de creacion de agente.
2. IF el usuario es member THEN THE UI SHALL ocultar la accion de crear agente.
3. WHEN un admin envia el formulario con un nombre no vacio THE UI SHALL solicitar la creacion del agente y mostrar el nuevo agente en la lista al confirmarse.
4. IF el nombre esta vacio THEN THE UI SHALL bloquear el envio e indicar que el nombre es obligatorio.
5. WHILE la creacion esta en curso, THE UI SHALL deshabilitar el boton de envio y mostrar estado de progreso.
6. IF la creacion falla THEN THE UI SHALL mostrar el mensaje de error sin perder los datos ya escritos.

### Requirement 3: Edicion de identidad y modelo del agente

**User Story:** Como admin de tenant, quiero editar la identidad y el modelo del agente, para definir su comportamiento.

#### Acceptance Criteria

1. WHEN un admin abre el editor de identidad THE UI SHALL mostrar el contenido vigente de cada tipo SOUL, IDENTITY y GUARDRAILS con su numero de version.
2. WHEN un admin guarda un cambio de identidad de un tipo THE UI SHALL solicitar el guardado como nueva version y reflejar la version incrementada al confirmarse.
3. WHEN un admin abre el historial de un tipo de identidad THE UI SHALL mostrar las versiones anteriores con fecha y autor.
4. WHEN un admin selecciona el modelo del agente entre "global por defecto" y un modelo concreto THE UI SHALL solicitar la actualizacion y reflejar la seleccion al confirmarse.
5. WHILE el modelo elegido sea "global por defecto", THE UI SHALL indicar que el agente usa el modelo global de la plataforma.
6. IF el usuario es member THEN THE UI SHALL mostrar la identidad y el modelo en modo solo lectura.
7. IF un guardado de identidad o de modelo falla THEN THE UI SHALL mostrar el error y conservar los cambios pendientes en el editor.

### Requirement 4: Asignacion de canales al agente

**User Story:** Como admin de tenant, quiero asignar o quitar canales a un agente, para definir por donde atiende.

#### Acceptance Criteria

1. WHEN un admin abre la seccion de canales del agente THE UI SHALL mostrar los canales enlazados al agente y los canales del tenant disponibles para enlazar.
2. WHEN un admin enlaza un canal disponible al agente THE UI SHALL solicitar el enlace y mover el canal a la lista de enlazados al confirmarse.
3. WHEN un admin quita un canal enlazado THE UI SHALL solicitar el desenlace y devolver el canal a la lista de disponibles al confirmarse.
4. THE UI SHALL mostrar para cada canal su tipo y su nombre visible, sin mostrar en ningun momento sus credenciales.
5. IF un canal ya esta enlazado a otro agente THEN THE UI SHALL indicarlo y, en esta fase, no permitir enlazarlo a un segundo agente.
6. IF una operacion de enlace o desenlace falla THEN THE UI SHALL mostrar el error y dejar el canal en su estado previo.
7. WHILE el usuario es member, THE UI SHALL mostrar los canales del agente en modo solo lectura.

### Requirement 5: Enlace de colecciones y conocimiento efectivo

**User Story:** Como admin de tenant, quiero enlazar o desenlazar colecciones de conocimiento y ver el conocimiento efectivo, para controlar que sabe el agente.

#### Acceptance Criteria

1. WHEN un admin abre la seccion de conocimiento del agente THE UI SHALL mostrar las colecciones enlazadas al agente y las colecciones del tenant disponibles para enlazar.
2. WHEN un admin enlaza una coleccion disponible THE UI SHALL solicitar el enlace y reflejarla como enlazada al confirmarse.
3. WHEN un admin desenlaza una coleccion enlazada THE UI SHALL solicitar el desenlace y dejar de mostrarla como enlazada al confirmarse.
4. WHEN se muestran las colecciones enlazadas THE UI SHALL presentar el conocimiento efectivo del agente como el conjunto de esas colecciones.
5. IF el conjunto de colecciones enlazadas esta vacio THEN THE UI SHALL indicar que el agente no tiene conocimiento efectivo.
6. IF una operacion de enlace o desenlace falla THEN THE UI SHALL mostrar el error y conservar el estado previo de las colecciones.
7. WHILE el usuario es member, THE UI SHALL mostrar las colecciones del agente en modo solo lectura.

### Requirement 6: Permisos y aislamiento por tenant

**User Story:** Como plataforma, quiero que la UI respete los permisos y el aislamiento por tenant, para que nadie administre agentes que no le corresponden.

#### Acceptance Criteria

1. WHILE el usuario es admin, THE UI SHALL habilitar las acciones de crear, editar, asignar canales y enlazar colecciones sobre cualquier agente del tenant.
2. WHILE el usuario es member, THE UI SHALL habilitar la visualizacion de los agentes asignados y deshabilitar toda accion de escritura.
3. THE UI SHALL operar siempre dentro del tenant activo y no mostrar agentes, canales ni colecciones de otros tenants.
4. IF un member intenta abrir el detalle de un agente que no tiene asignado THEN THE UI SHALL mostrar un estado de acceso no permitido en lugar del detalle.
5. THE UI SHALL no exponer en ningun panel las credenciales de los canales ni secretos de conexion.
