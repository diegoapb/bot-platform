---
id: US-013
---

# Requirements Document

## Introduction

Un agente que olvida a sus clientes no es un buen agente. Esta historia persiste memoria por contacto y bot: hechos estructurados (nombre, preferencias, contexto) y un resumen acumulado de conversaciones pasadas, que el motor inyecta en el contexto y mantiene actualizado.

## Glossary

| Término | Definición |
|---|---|
| Contacto | Cliente identificado por teléfono E.164 dentro de un bot (vía `channel_links`). |
| Hecho | Par clave-valor sobre el contacto (ej. `nombre: Ana`, `talla: M`), con origen `bot \| humano`. |
| Resumen | Texto acumulado que condensa conversaciones anteriores del contacto. |
| Extracción | Proceso por el cual el LLM identifica hechos nuevos al cierre de una conversación. |

## Requirements

### Requirement 1: Memoria en el contexto

**User Story:** Como cliente recurrente, quiero que el bot use lo que ya sabe de mí, para una atención continua.

#### Acceptance Criteria

1. WHEN el motor construye el contexto de una conversación THE sistema SHALL incluir los hechos y el resumen del contacto si existen.
2. IF el contacto no tiene memoria previa THEN THE sistema SHALL continuar sin error con contexto vacío de memoria.
3. WHILE existan memorias de varios bots o tenants, THE sistema SHALL usar exclusivamente la memoria del contacto en el bot actual.

### Requirement 2: Actualización de memoria

**User Story:** Como plataforma, quiero extraer y consolidar lo aprendido en cada conversación, para que la memoria mejore con el uso.

#### Acceptance Criteria

1. WHEN una conversación queda inactiva por más de 6 horas THE sistema SHALL ejecutar la extracción de hechos y la actualización del resumen.
2. WHEN la extracción produce un hecho con clave existente THE sistema SHALL actualizar el valor conservando la fecha del cambio.
3. IF la extracción falla THEN THE sistema SHALL conservar la memoria previa intacta y registrar el error.
4. WHEN se actualiza el resumen THE sistema SHALL mantenerlo por debajo de 2.000 caracteres condensando lo más antiguo.

### Requirement 3: Gestión desde el dashboard

**User Story:** Como admin de tenant, quiero ver y corregir la memoria de un contacto, para controlar lo que el bot recuerda.

#### Acceptance Criteria

1. WHEN un admin abre un contacto THE sistema SHALL mostrar sus hechos, el resumen y la fecha de última actualización.
2. WHEN un admin edita o elimina un hecho THE sistema SHALL aplicar el cambio con origen `humano`.
3. WHEN un admin borra la memoria completa del contacto THE sistema SHALL eliminar hechos y resumen de forma irreversible.
