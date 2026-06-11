---
id: US-015
---

# Requirements Document

## Introduction

La UI actual usa Tailwind defaults (paleta gris, fuentes de sistema, spacing genérico). Esta historia incorpora los tokens del Open Solvex Design System como única fuente de verdad de estilos: CSS variables (`colors_and_type.css` del knowledge-base), las tres familias tipográficas y el mapeo al theme de Tailwind para que el resto de la épica los consuma.

## Glossary

| Término | Definición |
|---|---|
| DS | Open Solvex Design System (`_spec-system/knowledge-base/OpenSolvexDesignSystem`). |
| Token | CSS variable del DS (ej. `--forest`, `--fs-h1`, `--s-4`, `--shadow-1`). |
| Surface dark | Scope `.surface-dark` que invierte tokens de foreground/background. |
| Theme mapping | Extensión de `tailwind.config.js` que expone tokens como utilidades. |

## Requirements

### Requirement 1: Tokens CSS del DS

**User Story:** Como desarrollador, quiero los tokens del DS como CSS variables globales, para referenciarlos desde cualquier estilo.

#### Acceptance Criteria

1. WHEN el frontend carga THE sistema SHALL exponer en `:root` los tokens de color (Forest, Lime, Beige, Graphite y derivados), líneas, sombras, radios, spacing (`--s-1`…`--s-28`), tipografía (`--fs-*`) y animación (`--ease-out`, `--t-*`) con los valores exactos del DS.
2. WHEN un contenedor usa la clase `.surface-dark` THE sistema SHALL aplicar los tokens invertidos de modo oscuro definidos por el DS (fg/bg/line).
3. WHEN se actualice el archivo fuente del DS THE proyecto SHALL tener un único archivo de tokens en el frontend que lo refleje (sin duplicación en múltiples archivos).

### Requirement 2: Tipografía

**User Story:** Como usuario, quiero ver la tipografía del DS en toda la app, para una identidad visual consistente.

#### Acceptance Criteria

1. WHEN el frontend carga THE sistema SHALL servir Space Grotesk (500), DM Sans (400–600) y Geist Mono (400–500) self-hosted o vía font provider, con `font-display: swap`.
2. WHEN se renderiza texto sin clase tipográfica explícita THE sistema SHALL usar DM Sans como familia base del body.
3. WHEN se usan las escalas `--fs-display`/`--fs-h1`/`--fs-h2` THE sistema SHALL aplicar tamaños fluidos con `clamp()` según el DS.

### Requirement 3: Integración con Tailwind

**User Story:** Como desarrollador, quiero usar los tokens vía clases Tailwind, para mantener la DX actual.

#### Acceptance Criteria

1. WHEN un desarrollador escribe clases como `bg-forest`, `text-lime`, `font-display`, `rounded-ds`, `shadow-ds-1` THE build de Tailwind SHALL resolverlas a los tokens CSS correspondientes.
2. WHEN se usan utilidades de spacing del DS THE theme SHALL exponer la escala 4/8pt sin eliminar la escala default (migración incremental).
3. WHILE existan páginas sin migrar, THE build SHALL seguir compilando los estilos actuales sin regresiones visuales.

### Requirement 4: Verificación

**User Story:** Como equipo, quiero validar que los tokens son fieles al DS, para evitar derivas.

#### Acceptance Criteria

1. WHEN se inspecciona la app en el navegador THE valores computados de los tokens SHALL coincidir con los del archivo fuente del DS.
2. WHEN corre el build de producción THE sistema SHALL incluir las fuentes y tokens sin aumentar el bundle JS (solo CSS/fonts).
