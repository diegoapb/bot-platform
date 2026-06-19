---
id: US-036
---

# Requirements Document

## Introduction

Tras US-035, un canal puede tener varios agentes candidatos y un agente por defecto, y cada contacto lleva una etapa. Falta el mecanismo que decide, de forma determinista, cuál de esos agentes candidatos atiende a un cliente concreto. Esta historia construye el motor de reglas declarativas: el admin define reglas ordenadas por prioridad que mapean condiciones sobre los datos del contacto (etapa, tags, si compró, facts, datos extraídos) a un agente candidato del canal, y una función de evaluación pura y determinista que devuelve el agente de la primera regla que matchea, o ninguno cuando ninguna aplica. El resultado debe ser auditable: siempre se sabe qué regla decidió. El fallback cuando ninguna regla matchea (orquestador y agente por defecto), la integración en el ciclo de la conversación y la UI quedan fuera de esta historia.

## Glossary

| Término | Definición |
|---|---|
| Agente | Entidad `agents`: identidad/prompt + modelo + conocimiento enlazado. El "cerebro" que atiende. |
| Canal | Entidad `channels`: transporte de mensajes de un tenant. |
| Agente candidato | Agente enlazado a un canal vía `agent_channels`; único elegible como destino de una regla de ese canal. |
| Contacto | Entidad `contacts`: identidad unificada del cliente por agente (teléfono/email), con su `stage` (etapa). |
| Regla de ruteo | Fila de `routing_rules`: una condición + un agente destino + una prioridad + un flag de habilitación, dentro de un canal. |
| Condición | Expresión declarativa (DSL) sobre datos del contacto que evalúa a verdadero o falso. |
| DSL de condición | Gramática cerrada de operadores (`eq`, `ne`, `in`, `exists`, `gt`, `gte`, `lt`, `lte`, `and`, `or`, `not`) sobre campos del contacto (`stage`, `tags`, `has_purchased`, `facts.<clave>`, `extracted.<clave>`). |
| Prioridad | Entero que ordena las reglas de un canal; menor prioridad se evalúa primero (ascendente). |
| Match | Una regla matchea cuando está habilitada y su condición evalúa a verdadero para el contacto. |
| Evaluación | Operación pura `evaluate(channel, contact)` que recorre las reglas habilitadas del canal por prioridad ascendente y devuelve el agente de la primera que matchea, o ninguno. |
| No-match | Resultado de la evaluación cuando ninguna regla habilitada matchea: devuelve ausencia de agente (el fallback lo resuelve US-038). |
| Tenant | Organización de Clerk (`tenantId` = org id). Frontera de aislamiento de todos los datos. |

## Requirements

### Requirement 1: Crear y editar reglas de ruteo

**User Story:** Como admin de tenant, quiero crear y editar reglas que mapeen una condición a un agente destino dentro de un canal, para controlar qué agente atiende a cada tipo de cliente.

#### Acceptance Criteria

1. WHEN un admin crea una regla en un canal del tenant con una condición compilable, una prioridad y un agente destino candidato del canal THE backend SHALL persistir la regla habilitada por defecto.
2. WHEN un admin edita la condición, la prioridad, el estado de habilitación o el agente destino de una regla existente THE backend SHALL persistir los nuevos valores conservando el identificador de la regla.
3. IF el admin crea o edita una regla con una condición que no compila contra el DSL THEN THE backend SHALL rechazar la operación indicando el error de compilación.
4. IF el admin crea o edita una regla cuyo agente destino no es candidato del canal THEN THE backend SHALL rechazar la operación indicando que el agente no es candidato del canal.
5. IF el admin crea o edita una regla en un canal de otro tenant, o con un agente destino de otro tenant THEN THE backend SHALL rechazar la operación.

### Requirement 2: Borrar y ordenar reglas

**User Story:** Como admin de tenant, quiero borrar reglas y cambiar su orden de prioridad, para mantener el ruteo del canal limpio y con la precedencia correcta.

#### Acceptance Criteria

1. WHEN un admin borra una regla del canal THE backend SHALL eliminar únicamente esa regla, dejando intactas las demás reglas del canal.
2. WHEN un admin reordena las reglas de un canal asignando prioridades THE backend SHALL persistir el nuevo orden de prioridad de las reglas afectadas.
3. WHEN un admin lista las reglas de un canal THE backend SHALL devolverlas ordenadas por prioridad ascendente.
4. IF dos o más reglas de un canal quedan con la misma prioridad THEN THE backend SHALL desempatar de forma determinista por un criterio estable y documentado.

### Requirement 3: Evaluación determinista por prioridad

**User Story:** Como motor de ruteo, quiero evaluar las reglas de un canal sobre un contacto y obtener el agente decidido, para enrutar siempre igual ante la misma entrada.

#### Acceptance Criteria

1. WHEN se evalúa un canal sobre un contacto THE motor SHALL devolver el agente destino de la primera regla habilitada del canal que matchea, recorriendo las reglas en orden de prioridad ascendente.
2. WHILE existan varias reglas que matchean al mismo contacto, THE motor SHALL devolver el agente de la regla con menor prioridad, ignorando las demás.
3. IF ninguna regla habilitada del canal matchea al contacto THEN THE motor SHALL devolver ausencia de agente.
4. WHEN se evalúa dos veces el mismo canal sobre el mismo contacto sin cambios en las reglas ni en los datos del contacto THE motor SHALL devolver siempre el mismo resultado.
5. WHILE una regla esté deshabilitada, THE motor SHALL excluirla de la evaluación aunque su condición matchee al contacto.

### Requirement 4: DSL de condiciones sobre datos del contacto

**User Story:** Como admin de tenant, quiero expresar condiciones sobre la etapa, tags, si el cliente compró, sus facts y sus datos extraídos, para discriminar qué cliente va a qué agente.

#### Acceptance Criteria

1. WHEN una condición referencia los campos `stage`, `tags`, `has_purchased`, un fact por clave o un dato extraído por clave THE motor SHALL resolver su valor a partir de los datos vigentes del contacto.
2. WHEN una condición usa los operadores del DSL (`eq`, `ne`, `in`, `exists`, `gt`, `gte`, `lt`, `lte`) y los combinadores (`and`, `or`, `not`) THE motor SHALL evaluarla a un valor booleano.
3. IF una condición referencia un fact o dato extraído inexistente en el contacto y usa un operador distinto de `exists` THEN THE motor SHALL evaluar esa subcondición a falso sin lanzar error.
4. IF una condición usa un campo, operador o estructura no contemplado por el DSL THEN THE backend SHALL rechazarla en tiempo de compilación.
5. WHEN una condición combina varias subcondiciones THE motor SHALL aplicar la semántica booleana estándar de `and`, `or` y `not` sin efectos secundarios.

### Requirement 5: Validación del agente destino candidato

**User Story:** Como admin de tenant, quiero que una regla solo pueda apuntar a un agente que atiende el canal, para no enrutar a un agente que no está disponible en ese canal.

#### Acceptance Criteria

1. WHEN se crea o edita una regla THE backend SHALL aceptar como agente destino únicamente un agente candidato del canal.
2. IF un agente deja de ser candidato del canal THEN THE backend SHALL impedir su retirada del canal mientras siga siendo destino de alguna regla, o invalidar las reglas que lo apuntan, según la política definida.
3. WHEN el motor evalúa una regla cuyo agente destino ya no es candidato del canal THE motor SHALL tratar esa regla como no aplicable y continuar con la siguiente.

### Requirement 6: Auditabilidad y aislamiento

**User Story:** Como admin de tenant, quiero saber qué regla decidió el agente y que las reglas de un tenant nunca afecten a otro, para confiar y auditar el ruteo.

#### Acceptance Criteria

1. WHEN el motor decide un agente para un contacto THE motor SHALL exponer junto al resultado la identidad de la regla que decidió.
2. WHEN el motor devuelve ausencia de agente THE motor SHALL exponer que no decidió ninguna regla.
3. WHILE existan reglas de varios tenants o canales, THE motor SHALL evaluar únicamente las reglas del canal consultado y de su mismo tenant.
4. WHEN un admin consulta, crea, edita o borra reglas de un canal de otro tenant THE backend SHALL rechazar la operación.
