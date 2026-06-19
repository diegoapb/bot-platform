---
id: US-039
---

# Requirements Document

## Introduction

El ruteo multi-agente de E14 (agentes candidatos del canal, agente por defecto, motor de reglas, orquestador y resolver) vive hoy solo en backend: no hay forma de que un admin lo administre sin tocar la base de datos. Esta historia construye la pagina de configuracion de ruteo por canal en el panel: asignar los agentes candidatos y el agente por defecto del canal, construir y ordenar reglas (condicion sobre datos del contacto -> agente destino, con prioridad), configurar el orquestador (instrucciones y candidatos elegibles) y un simulador que, dado un contacto de ejemplo (etapa, tags, facts, datos extraidos), muestra que agente resolveria y por que via (regla concreta, orquestador o agente por defecto). El backend de reglas, orquestador y resolucion queda fuera (US-035 a US-038): esta historia solo consume esos contratos y respeta los permisos que el backend ya impone.

## Glossary

| Término | Definición |
|---|---|
| Canal | Entidad de transporte de mensajes del tenant (Telegram, WhatsApp Cloud, Instagram, Messenger, WhatsApp/Evolution legacy). La configuracion de ruteo es por canal. |
| Agente | "Cerebro" que atiende: identidad/prompt, modelo y conocimiento enlazado. |
| Agente candidato | Agente enlazado a un canal; unico elegible como destino de una regla, como candidato del orquestador o como agente por defecto de ese canal. |
| Agente por defecto | Agente del canal que actua como fallback final del ruteo cuando ninguna regla ni el orquestador deciden. |
| Regla de ruteo | Condicion sobre datos del contacto + agente destino + prioridad + estado de habilitacion, dentro de un canal. |
| Condicion | Expresion declarativa sobre datos del contacto (etapa, tags, si compro, facts, datos extraidos) que evalua a verdadero o falso. |
| Prioridad | Orden de evaluacion de las reglas de un canal; menor prioridad se evalua primero (ascendente). |
| Orquestador | Router por LLM que, en ausencia de match de reglas, elige un agente de entre los candidatos del canal segun unas instrucciones configurables. |
| Simulador | Herramienta de la UI que, dado un contacto de ejemplo, pide al backend la resolucion del ruteo y muestra el agente resultante y el motivo de la decision. |
| Via de decision | Origen del agente resuelto: una regla concreta, el orquestador o el agente por defecto. |
| Contacto de ejemplo | Conjunto de datos de prueba (etapa, tags, facts, datos extraidos) introducido por el admin para alimentar el simulador, sin persistirse como contacto real. |
| Admin / Member | Roles de Clerk del tenant (`org:admin` / `org:member`). Admin administra; member solo consulta. |
| Tenant | Organizacion de Clerk (`tenantId` = org id). Frontera de aislamiento de todos los datos. |

## Requirements

### Requirement 1: Asignar agentes candidatos y agente por defecto del canal

**User Story:** Como admin de tenant, quiero asignar los agentes candidatos de un canal y elegir su agente por defecto, para definir quien puede atender y cual es el fallback.

#### Acceptance Criteria

1. WHEN un admin abre la configuracion de ruteo de un canal del tenant THE UI SHALL mostrar los agentes candidatos del canal y el agente por defecto actual, o su ausencia si no se ha definido.
2. WHEN un admin agrega un agente del tenant como candidato del canal THE UI SHALL enviar el alta y reflejar al agente en la lista de candidatos tras la confirmacion.
3. WHEN un admin quita un agente candidato del canal THE UI SHALL enviar la baja y dejar de mostrarlo como candidato tras la confirmacion.
4. WHEN un admin define el agente por defecto del canal eligiendo entre los candidatos THE UI SHALL enviar el cambio y mostrar ese agente como agente por defecto tras la confirmacion.
5. IF el admin intenta quitar un agente candidato que es el agente por defecto o destino de alguna regla THEN THE UI SHALL impedir la baja e indicar el motivo.
6. WHILE el canal no tenga ningun agente candidato, THE UI SHALL ocultar o deshabilitar la creacion de reglas, la configuracion del orquestador y la eleccion de agente por defecto.

### Requirement 2: Construir y editar reglas de ruteo

**User Story:** Como admin de tenant, quiero crear y editar reglas que mapeen una condicion a un agente destino, para controlar que agente atiende a cada tipo de cliente.

#### Acceptance Criteria

1. WHEN un admin crea una regla indicando una condicion, un agente destino candidato y dejandola habilitada THE UI SHALL enviar el alta y mostrar la regla en la lista del canal tras la confirmacion.
2. WHEN un admin edita la condicion, el agente destino o el estado de habilitacion de una regla THE UI SHALL enviar el cambio y reflejar los nuevos valores tras la confirmacion.
3. WHEN un admin construye una condicion con el constructor visual THE UI SHALL ofrecer solo los campos del contacto (etapa, tags, si compro, facts, datos extraidos) y los operadores soportados.
4. IF el admin intenta guardar una regla sin agente destino o con una condicion incompleta THEN THE UI SHALL bloquear el envio e indicar que campos faltan.
5. IF el admin elige como agente destino un agente que no es candidato del canal THEN THE UI SHALL impedir la seleccion o el guardado e indicar que el agente no es candidato del canal.
6. IF el backend rechaza el alta o la edicion de una regla THEN THE UI SHALL mostrar el motivo y conservar los datos introducidos para corregirlos.

### Requirement 3: Ordenar, habilitar y borrar reglas

**User Story:** Como admin de tenant, quiero reordenar, activar/desactivar y borrar reglas, para mantener el ruteo limpio y con la precedencia correcta.

#### Acceptance Criteria

1. WHEN un admin lista las reglas de un canal THE UI SHALL mostrarlas ordenadas por prioridad ascendente con su condicion, agente destino y estado de habilitacion.
2. WHEN un admin reordena las reglas arrastrandolas o moviendolas THE UI SHALL enviar el nuevo orden de prioridad y reflejarlo tras la confirmacion.
3. WHEN un admin activa o desactiva una regla THE UI SHALL enviar el cambio de habilitacion y reflejar el nuevo estado tras la confirmacion.
4. WHEN un admin borra una regla y confirma la accion THE UI SHALL enviar la baja y dejar de mostrar esa regla conservando las demas.
5. WHILE una regla este deshabilitada, THE UI SHALL distinguirla visualmente de las reglas activas.

### Requirement 4: Configurar el orquestador del canal

**User Story:** Como admin de tenant, quiero configurar las instrucciones del orquestador y los candidatos que puede elegir, para definir el fallback inteligente cuando ninguna regla decide.

#### Acceptance Criteria

1. WHEN un admin abre los ajustes del orquestador de un canal THE UI SHALL mostrar las instrucciones actuales y los agentes candidatos elegibles por el orquestador.
2. WHEN un admin edita las instrucciones del orquestador THE UI SHALL enviar el cambio y reflejar las nuevas instrucciones tras la confirmacion.
3. WHEN un admin marca o desmarca un agente candidato como elegible por el orquestador THE UI SHALL enviar el cambio y reflejar la nueva seleccion tras la confirmacion.
4. THE UI SHALL ofrecer como elegibles por el orquestador unicamente agentes candidatos del canal.
5. IF el backend rechaza un cambio del orquestador THEN THE UI SHALL mostrar el motivo y conservar los valores introducidos.

### Requirement 5: Simular la resolucion del ruteo

**User Story:** Como admin de tenant, quiero simular un contacto de ejemplo y ver que agente resolveria y por que, para validar la configuracion antes de aplicarla a clientes reales.

#### Acceptance Criteria

1. WHEN un admin introduce un contacto de ejemplo (etapa, tags, facts, datos extraidos) y ejecuta la simulacion THE UI SHALL enviar esos datos al backend de resolucion y mostrar el agente resultante.
2. WHEN la simulacion devuelve un resultado THE UI SHALL mostrar la via de decision: la regla concreta que decidio, el orquestador o el agente por defecto.
3. IF la simulacion resuelve por una regla THEN THE UI SHALL identificar cual regla matcheo.
4. IF la simulacion no resuelve ningun agente THEN THE UI SHALL indicar que ningun agente atenderia con esa configuracion.
5. WHEN un admin cambia los datos del contacto de ejemplo y vuelve a simular THE UI SHALL mostrar el resultado de la nueva entrada sin arrastrar el resultado anterior.
6. THE UI SHALL tratar el contacto de ejemplo como datos de prueba y no persistirlo como contacto real del tenant.

### Requirement 6: Estados de carga y error

**User Story:** Como admin de tenant, quiero ver claramente cuando la configuracion esta cargando o falla, para no actuar sobre datos incompletos.

#### Acceptance Criteria

1. WHILE la configuracion de ruteo del canal se este cargando, THE UI SHALL mostrar un estado de carga en lugar de datos parciales.
2. IF la carga de candidatos, reglas, orquestador o agente por defecto falla THEN THE UI SHALL mostrar un mensaje de error y ofrecer reintentar.
3. WHILE una operacion de escritura este en curso, THE UI SHALL indicar el progreso y evitar envios duplicados de la misma operacion.
4. IF una operacion de escritura falla THEN THE UI SHALL mostrar el error y dejar la vista en el estado previo a la operacion.

### Requirement 7: Permisos admin/member

**User Story:** Como tenant, quiero que solo los admin modifiquen el ruteo y los member solo lo consulten, para evitar cambios no autorizados.

#### Acceptance Criteria

1. WHILE el usuario tenga rol admin del tenant, THE UI SHALL habilitar la asignacion de candidatos, la edicion de reglas, el orden, la habilitacion, el borrado, la configuracion del orquestador y el agente por defecto.
2. WHILE el usuario tenga rol member, THE UI SHALL mostrar la configuracion de ruteo en modo solo lectura sin controles de escritura.
3. WHILE el usuario tenga rol member, THE UI SHALL permitir ejecutar el simulador en modo solo lectura.
4. IF el backend rechaza una operacion por falta de permisos THEN THE UI SHALL mostrar el motivo sin alterar el estado mostrado.
