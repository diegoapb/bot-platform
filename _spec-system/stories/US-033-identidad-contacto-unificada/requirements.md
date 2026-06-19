---
id: US-033
---

# Requirements Document

## Introduction

Un mismo cliente puede escribir a un agente por varios canales (WhatsApp vía Evolution, Instagram, Telegram, WhatsApp Cloud). Hoy cada conexión cliente↔canal vive como un `channel_link` independiente, y la memoria, los facts y los datos extraídos cuelgan de ese link, así que el agente trata a la misma persona como contactos distintos sin contexto compartido. Esta historia introduce el **contacto** como entidad propia del agente, identificado por teléfono o email normalizado, y unifica bajo él todos los `channel_links` que comparten identificador, re-anclando la memoria al contacto. El contacto es **por agente**: nunca se unifica entre agentes distintos ni entre tenants. Materializa la decisión D6 del research de desacople agentes↔canales.

## Glossary

| Término | Definición |
|---|---|
| Contacto | Persona del lado del cliente, propia de un agente, identificada por un identificador primario (teléfono E.164 o email normalizado). Agrupa uno o más `channel_links`. |
| Identificador primario | Valor canónico que identifica al contacto: teléfono en formato E.164 o email en minúsculas sin espacios. Único por (agente, valor). |
| `channel_link` | Vínculo existente entre un cliente y un canal concreto del agente (mapea al contacto en Chatwoot por canal). Pasa a colgar de un contacto. |
| Resolución de contacto | Proceso de encontrar o crear el contacto del agente para un identificador entrante, de forma idempotente. |
| Unificación | Acción de asociar varios `channel_links` con identificador coincidente al mismo contacto del agente. |
| Identificador fiable | Identificador presente, normalizable y con suficiente confianza para identificar a una persona (un teléfono E.164 válido o un email válido). |
| Memoria del contacto | Conjunto de `contact_memories`, `contact_facts` y `extracted_data` asociado a un contacto. |
| Agente | Entidad "cerebro" (sucesora de `bots`) dueña del contacto. El aislamiento es por (tenant, agente). |

## Requirements

### Requirement 1: Normalización del identificador

**User Story:** Como agente, quiero que el identificador del cliente se normalice a una forma canónica, para que el mismo cliente no genere contactos duplicados por diferencias de formato.

#### Acceptance Criteria

1. WHEN llega un mensaje entrante con un teléfono THE sistema SHALL normalizar el teléfono a formato E.164 antes de resolver el contacto.
2. WHEN llega un mensaje entrante con un email THE sistema SHALL normalizar el email a minúsculas y sin espacios antes de resolver el contacto.
3. IF el identificador entrante no puede normalizarse a un teléfono E.164 ni a un email válido THEN THE sistema SHALL tratarlo como identificador no fiable.
4. WHEN dos identificadores entrantes producen la misma forma canónica THE sistema SHALL considerarlos el mismo identificador primario.

### Requirement 2: Resolución y creación idempotente del contacto

**User Story:** Como agente, quiero que al llegar un mensaje se resuelva o cree un único contacto, para anclar toda la interacción a una sola identidad.

#### Acceptance Criteria

1. WHEN llega un mensaje entrante con identificador fiable y no existe contacto del agente con ese identificador primario THE sistema SHALL crear un contacto con ese identificador primario.
2. WHEN llega un mensaje entrante con identificador fiable y ya existe contacto del agente con ese identificador primario THE sistema SHALL reutilizar el contacto existente sin crear uno nuevo.
3. WHEN dos mensajes con el mismo identificador fiable se procesan de forma concurrente THE sistema SHALL garantizar que se cree a lo sumo un contacto para ese identificador en el agente.
4. WHEN se resuelve el contacto de un `channel_link` THE sistema SHALL asociar el `channel_link` a ese contacto.

### Requirement 3: Unificación al coincidir identificador dentro del agente

**User Story:** Como agente, quiero que los canales de un mismo cliente queden bajo el mismo contacto, para verlo como una sola persona aunque use varios canales.

#### Acceptance Criteria

1. WHEN un `channel_link` nuevo se resuelve y su identificador coincide con el de un contacto existente del agente THE sistema SHALL asociar ese `channel_link` al contacto existente.
2. WHILE varios `channel_links` del mismo agente comparten identificador primario, THE sistema SHALL mantenerlos asociados a un único contacto.
3. IF un `channel_link` ya está asociado a un contacto y vuelve a llegar tráfico por él THEN THE sistema SHALL conservar la asociación existente sin reasignarlo.

### Requirement 4: Memoria, facts y datos compartidos entre canales del contacto

**User Story:** Como agente, quiero que la memoria del cliente se comparta entre sus canales, para no repetir preguntas y mantener contexto continuo.

#### Acceptance Criteria

1. WHEN el pipeline lee la memoria de una conversación THE sistema SHALL devolver la memoria asociada al contacto, no a un canal individual.
2. WHEN el pipeline persiste un resumen, un fact o un dato extraído THE sistema SHALL anclarlo al contacto.
3. WHILE un contacto agrupa varios `channel_links`, THE sistema SHALL exponer un único valor vigente por clave de fact para ese contacto.
4. WHEN un cliente conocido por un canal escribe por primera vez por otro canal del mismo agente con el mismo identificador THE sistema SHALL poner a disposición de la nueva conversación la memoria previa del contacto.

### Requirement 5: Aislamiento entre agentes y tenants

**User Story:** Como plataforma, quiero que los contactos no se mezclen entre agentes ni entre tenants, para garantizar privacidad y aislamiento de datos.

#### Acceptance Criteria

1. WHILE dos agentes comparten un mismo identificador primario entrante, THE sistema SHALL mantener un contacto independiente por agente.
2. IF un identificador existe en otro tenant THEN THE sistema SHALL ignorarlo al resolver el contacto del agente consultado.
3. WHEN el pipeline lee o escribe memoria de un contacto THE sistema SHALL operar únicamente sobre datos del mismo agente y tenant.

### Requirement 6: Comportamiento sin identificador fiable

**User Story:** Como agente, quiero atender a clientes cuyo canal no aporta un identificador fiable, para no bloquear la conversación ni fusionar identidades por error.

#### Acceptance Criteria

1. IF un mensaje entrante no aporta identificador fiable THEN THE sistema SHALL crear o reutilizar un contacto propio del `channel_link` sin unificarlo con otros.
2. WHILE un `channel_link` no tenga identificador fiable, THE sistema SHALL mantener su memoria aislada de la del resto de canales del agente.
3. IF un `channel_link` sin identificador fiable obtiene posteriormente uno fiable que coincide con un contacto existente THEN THE sistema SHALL permitir asociarlo a ese contacto sin perder la memoria ya registrada.
