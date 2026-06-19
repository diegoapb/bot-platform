---
id: US-037
---

# Requirements Document

## Introduction

El motor de reglas determinista (US-036) decide el agente cuando alguna regla del canal matchea, pero devuelve ausencia de agente cuando ninguna aplica. Esta historia construye el segundo escalón del ruteo híbrido (decisión D1): un agente orquestador por canal que, ante ese no-match, clasifica el contexto del contacto y el último mensaje y elige UN agente de entre los candidatos del canal. La elección está restringida al conjunto de candidatos (el orquestador nunca devuelve un agente que no atiende el canal ni inventa uno). Para no incurrir en coste ni latencia innecesarios, el orquestador solo se invoca cuando el motor de reglas no decidió. Si el orquestador falla, agota su tiempo, o devuelve una salida inválida, el ruteo cae al agente por defecto del canal (US-035). Cada invocación —exitosa o fallida— queda trazada de forma auditable. Esta historia define la configuración del orquestador por canal y la operación de clasificación; el motor de reglas (US-036), la cadena completa de resolución y fijación del agente en la conversación (US-038) y la UI (US-039) quedan fuera.

## Glossary

| Término | Definición |
|---|---|
| Agente | Entidad `agents`: identidad/prompt + modelo + conocimiento enlazado. El "cerebro" que atiende. |
| Canal | Entidad `channels`: transporte de mensajes de un tenant. |
| Agente candidato | Agente enlazado a un canal vía `agent_channels`; único elegible como destino del orquestador en ese canal. |
| Agente por defecto | Agente del canal (`channels.default_agent_id`); fallback final del ruteo cuando el orquestador no decide. |
| Contacto | Entidad `contacts`: identidad unificada del cliente por agente, con su etapa (`stage`), facts y datos extraídos. |
| Orquestador | Configuración por canal (agentes candidatos + instrucciones de clasificación) que gobierna el router LLM. |
| Router LLM | Invocación a un modelo de lenguaje que, dado el contexto, devuelve UN agente del conjunto candidato. |
| Salida restringida | Garantía de que la respuesta del router LLM pertenece siempre al conjunto de candidatos del canal. |
| No-match | Resultado del motor de reglas (US-036) cuando ninguna regla habilitada decide un agente. |
| Contexto de clasificación | Datos que recibe el router LLM: etapa, facts y datos extraídos del contacto, y el último mensaje del cliente. |
| Traza | Fila de `generations` que registra modelo, prompt, elección, latencia y error de una invocación. |
| Fallback final | Devolución del agente por defecto del canal cuando el orquestador no produce una elección válida. |
| Tenant | Organización de Clerk (`tenantId` = org id). Frontera de aislamiento de todos los datos. |

## Requirements

### Requirement 1: Configuración del orquestador por canal

**User Story:** Como admin de tenant, quiero configurar el orquestador de un canal con sus instrucciones de clasificación, para guiar cómo el router elige entre los agentes candidatos.

#### Acceptance Criteria

1. WHEN un admin define o edita las instrucciones de clasificación del orquestador de un canal del tenant THE backend SHALL persistir esas instrucciones asociadas al canal.
2. WHEN un admin habilita o deshabilita el orquestador de un canal THE backend SHALL persistir ese estado de habilitación.
3. WHEN un admin consulta la configuración del orquestador de un canal THE backend SHALL devolver sus instrucciones, su estado de habilitación y los agentes candidatos vigentes del canal.
4. WHILE el orquestador de un canal no tenga instrucciones definidas, THE backend SHALL exponer el orquestador como sin instrucciones.
5. IF el admin configura o consulta el orquestador de un canal de otro tenant THEN THE backend SHALL rechazar la operación.

### Requirement 2: Invocación condicionada al no-match de reglas

**User Story:** Como plataforma, quiero invocar el orquestador únicamente cuando el motor de reglas no decidió, para no gastar coste ni latencia cuando una regla ya resolvió el ruteo.

#### Acceptance Criteria

1. WHEN el motor de reglas devuelve un agente para un contacto THE orquestador SHALL NOT ser invocado para esa resolución.
2. WHEN el motor de reglas devuelve ausencia de agente para un contacto THE orquestador SHALL ser invocado para intentar decidir el agente.
3. IF el orquestador del canal está deshabilitado THEN THE orquestador SHALL NOT ser invocado aunque el motor de reglas haya devuelto ausencia de agente.
4. IF el canal no tiene al menos un agente candidato THEN THE orquestador SHALL devolver ausencia de elección sin invocar el router LLM.

### Requirement 3: Elección restringida al conjunto de candidatos

**User Story:** Como plataforma, quiero que el orquestador elija siempre un agente que atiende el canal, para no enrutar nunca a un agente no disponible ni a uno inventado.

#### Acceptance Criteria

1. WHEN el orquestador decide un agente para un contacto THE agente devuelto SHALL ser uno de los agentes candidatos vigentes del canal.
2. IF el router LLM devuelve un identificador que no corresponde a ningún agente candidato del canal THEN THE orquestador SHALL tratar la respuesta como elección inválida.
3. WHEN el canal tiene un único agente candidato THE orquestador SHALL devolver ese agente sin necesidad de invocar el router LLM.
4. WHILE existan agentes candidatos de varios canales o tenants, THE orquestador SHALL considerar como elegibles únicamente los agentes candidatos del canal consultado y de su mismo tenant.

### Requirement 4: Contexto de clasificación

**User Story:** Como orquestador, quiero recibir la etapa, los facts, los datos extraídos del contacto y el último mensaje, para clasificar el contexto y elegir el agente adecuado.

#### Acceptance Criteria

1. WHEN el orquestador clasifica un contacto THE orquestador SHALL construir el contexto a partir de la etapa del contacto, sus facts, sus datos extraídos vigentes y el último mensaje del cliente.
2. IF el contacto no tiene etapa, facts o datos extraídos THEN THE orquestador SHALL clasificar con el contexto disponible sin lanzar error.
3. WHEN el orquestador presenta los candidatos al router LLM THE orquestador SHALL incluir, por cada candidato, datos que permitan distinguirlo de los demás.

### Requirement 5: Fallback ante fallo o salida inválida

**User Story:** Como plataforma, quiero que el ruteo no se quede sin agente cuando el orquestador falla, para que siempre haya un agente que atienda al cliente.

#### Acceptance Criteria

1. IF el router LLM devuelve un error THEN THE orquestador SHALL devolver el agente por defecto del canal.
2. IF el router LLM excede el tiempo máximo de respuesta THEN THE orquestador SHALL devolver el agente por defecto del canal.
3. IF la respuesta del router LLM es una elección inválida THEN THE orquestador SHALL devolver el agente por defecto del canal.
4. IF el orquestador no produce una elección válida y el canal no tiene agente por defecto THEN THE orquestador SHALL devolver ausencia de agente.
5. WHEN el orquestador devuelve un agente por fallback THE orquestador SHALL señalar que la decisión provino del agente por defecto y no de una clasificación.

### Requirement 6: Traza y auditabilidad de la decisión

**User Story:** Como admin de tenant, quiero una traza de cada invocación del orquestador, para auditar qué decidió, con qué modelo y a qué coste de latencia.

#### Acceptance Criteria

1. WHEN el orquestador invoca el router LLM THE orquestador SHALL registrar una traza con el modelo usado, el prompt enviado y la latencia de la invocación.
2. WHEN el router LLM devuelve una elección THE orquestador SHALL registrar en la traza el agente elegido.
3. WHEN el router LLM devuelve un error o agota el tiempo THE orquestador SHALL registrar el error en la traza.
4. WHEN el orquestador resuelve por fallback al agente por defecto THE orquestador SHALL registrar en la traza que la decisión fue por fallback.
5. WHILE existan trazas de varios tenants, THE backend SHALL aislar las trazas por `tenantId` y no exponer trazas de otro tenant.
