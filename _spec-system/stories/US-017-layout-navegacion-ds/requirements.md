---
id: US-017
---

# Requirements Document

## Introduction

El shell actual (`Layout.tsx`) usa header genérico gris y contenido a max-width 896px. Esta historia lo alinea al DS: header dark (forest) con navegación mono, contenido en rail de 1240px con padding fluido, y un sistema de superficies (forest/beige) que las páginas heredan. Incluye los estados de Clerk (org switcher, user button) estilizados acorde.

## Glossary

| Término | Definición |
|---|---|
| Shell | Layout persistente: header, nav, contenedor de contenido. |
| Rail | Contenedor centrado `max-width: var(--maxw)` con `--pad-x`. |
| Superficie | Ground color de sección (forest dark o beige light) con tokens scoped. |

## Requirements

### Requirement 1: Header y navegación

**User Story:** Como usuario, quiero un header con la identidad del DS, para orientarme en la app.

#### Acceptance Criteria

1. WHEN se renderiza el shell THE header SHALL usar superficie forest (`.surface-dark`) con logo, navegación en Geist Mono y separador hairline `--line-dark`.
2. WHEN el usuario navega THE ítem activo SHALL distinguirse con acento lime (texto o indicador), no con fondos genéricos.
3. WHEN se muestra el org switcher y user button de Clerk THE sistema SHALL aplicar appearance overrides coherentes con el header dark.
4. WHEN la pantalla es menor a 768px THE navegación SHALL colapsar a un menú accesible sin perder ítems.

### Requirement 2: Rail de contenido y superficies

**User Story:** Como usuario, quiero un layout de contenido consistente, para leer cómodamente en cualquier viewport.

#### Acceptance Criteria

1. WHEN se renderiza cualquier página THE contenido SHALL centrarse en un rail de `--maxw` (1240px) con padding horizontal `--pad-x` fluido.
2. WHEN una página declara superficie dark THE shell SHALL aplicar `.surface-dark` con sus tokens invertidos.
3. WHILE existan páginas sin migrar (US-018), THE shell nuevo SHALL renderizarlas sin romper su maquetación.

### Requirement 3: Estados de carga y gates

**User Story:** Como usuario, quiero que las pantallas de carga, error y acceso (TenantGate, SuperAdminGate, login) compartan el DS, para no ver saltos de identidad.

#### Acceptance Criteria

1. WHEN un gate bloquea el acceso THE pantalla SHALL usar superficie, tipografía y botones del DS.
2. WHEN hay estados de carga del shell THE sistema SHALL mostrar indicadores con los tokens de animación del DS (sin spinners genéricos azules).
