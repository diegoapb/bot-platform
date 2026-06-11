---
id: US-018
---

# Requirements Document

## Introduction

Con tokens (US-015), componentes (US-016) y shell (US-017) listos, esta historia migra cada página y sub-vista a la nueva librería, eliminando clases Tailwind ad-hoc de paleta/typo/sombra. Solo presentación: ninguna llamada a API, estado ni comportamiento cambia.

## Glossary

| Término | Definición |
|---|---|
| Migrar | Reemplazar estilos ad-hoc por componentes/utilidades del DS sin cambio funcional. |
| Tabs del bot | WhatsApp, Chatwoot, Identidad, Conocimiento, Catálogo, Conversaciones, Contactos, Trazas. |
| Paridad funcional | Mismos flujos, datos y permisos antes y después de la migración. |

## Requirements

### Requirement 1: Páginas principales

**User Story:** Como usuario, quiero las páginas de listado y dashboards con el DS, para una experiencia consistente.

#### Acceptance Criteria

1. WHEN un usuario abre `/` (BotsPage) THE listado de bots SHALL usar Cards del DS con eyebrow, icon tile y tags, y el CTA de crear bot SHALL ser Button primary.
2. WHEN un usuario abre `/conversations` y una conversación THE lista y el historial SHALL usar tipografía, superficies y badges (modo/origen) del DS.
3. WHEN un admin abre `/metrics` THE dashboard SHALL usar StatTiles del DS para KPIs y los gráficos recharts SHALL usar la paleta de tokens (forest/lime/graphite).
4. WHEN un admin abre `/team` o `/admin` THE tablas y acciones SHALL usar componentes del DS.

### Requirement 2: Detalle de bot y sus tabs

**User Story:** Como usuario, quiero el detalle del bot y sus 8 tabs con el DS, para operar el bot con la misma identidad.

#### Acceptance Criteria

1. WHEN un usuario abre `/bots/:id` THE navegación de tabs SHALL usar el patrón mono/lime del DS.
2. WHEN un usuario abre cualquiera de los 8 tabs THE formularios, listas y estados (vacío, carga, error) SHALL usar componentes e inputs del DS.
3. WHEN un tab muestra el QR de conexión WhatsApp THE contenedor SHALL seguir el patrón de card del DS preservando legibilidad del QR.

### Requirement 3: Paridad y limpieza

**User Story:** Como equipo, quiero garantizar que la migración no cambia el comportamiento ni deja restos, para cerrar la épica con confianza.

#### Acceptance Criteria

1. WHEN se completa la migración de una vista THE flujos, datos y permisos SHALL ser idénticos a los previos (paridad funcional).
2. WHEN se audita el código frontend THE sistema SHALL no contener clases de paleta Tailwind genérica (`bg-gray-*`, `text-slate-*`, `bg-blue-*`, etc.) ni hex hardcodeados fuera de `tokens.css`.
3. WHEN se ejecuta la revisión visual final THE todas las rutas SHALL aprobarse side-by-side contra el DS en light y, donde aplique, dark.
