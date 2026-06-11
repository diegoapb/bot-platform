---
id: US-016
---

# Requirements Document

## Introduction

La UI actual construye botones, tarjetas y formularios con clases Tailwind ad-hoc en cada vista. Esta historia crea la librería de componentes base del DS en `apps/frontend/src/components/ui/`, con variantes tipadas (CVA) que encapsulan los patrones del Open Solvex Design System, para que la migración de páginas (US-018) sea una sustitución de componentes y no un restyling manual.

## Glossary

| Término | Definición |
|---|---|
| CVA | class-variance-authority, librería ya presente para variantes tipadas. |
| Icon tile | Squircle 44–52px con fondo forest e icono lime (patrón de cards del DS). |
| Eyebrow | Etiqueta mono uppercase con regla corta (`—`) que antecede títulos. |
| Glow lime | Sombra `--glow-lime` reservada a CTAs primarios. |

## Requirements

### Requirement 1: Botones

**User Story:** Como desarrollador, quiero un componente Button con las variantes del DS, para todos los CTAs de la app.

#### Acceptance Criteria

1. WHEN se usa `<Button variant="primary">` THE sistema SHALL renderizar botón pill lime con glow en hover y flecha que anima +3px según el DS.
2. WHEN se usan variantes `ghost-light` / `ghost-dark` THE sistema SHALL aplicar bordes y text-shift del DS según la superficie.
3. WHEN se renderiza un botón THE sistema SHALL usar DM Sans, radio `--r-pill` y transiciones `--ease-out`/`--t-fast`.

### Requirement 2: Tarjetas

**User Story:** Como desarrollador, quiero un componente Card con variantes light y dark-feature, para listas y dashboards.

#### Acceptance Criteria

1. WHEN se usa `<Card variant="light">` THE sistema SHALL aplicar fondo beige-paper, borde 1px `--line-light`, padding 24–28px y `--shadow-1` solo en hover.
2. WHEN se usa `<Card variant="dark">` THE sistema SHALL aplicar fondo forest con borde lime en hover dentro de `.surface-dark`.
3. WHEN una card incluye subcomponentes (Eyebrow, IconTile, título, body, tags) THE sistema SHALL respetar la estructura interna del DS.

### Requirement 3: Componentes de soporte

**User Story:** Como desarrollador, quiero los componentes menores del DS, para cubrir formularios, etiquetas y métricas.

#### Acceptance Criteria

1. WHEN se usan `Tag`/`Badge` THE sistema SHALL renderizar squircle `--r-sm` mono, lime en superficies dark y graphite en light.
2. WHEN se usan `Input`/`Textarea`/`Select` THE sistema SHALL aplicar borde `--line-light`, placeholder graphite-3 y blur backdrop en superficies dark.
3. WHEN se usa `Eyebrow` THE sistema SHALL renderizar mono uppercase 12px con leading rule.
4. WHEN se usa `StatTile` THE sistema SHALL mostrar número en display font lime + label mono, con separador dashed.
5. WHEN se renderizan iconos THE sistema SHALL usar Lucide con stroke 1.5px y los tamaños del DS (16–26px), con `IconTile` para cards.

### Requirement 4: Calidad y documentación

**User Story:** Como equipo, quiero ver y validar los componentes aislados, para revisar fidelidad al DS antes de migrar páginas.

#### Acceptance Criteria

1. WHEN se abre la ruta interna de showcase (solo dev) THE sistema SHALL mostrar todos los componentes con todas sus variantes sobre superficies light y dark.
2. WHEN un componente recibe props inválidas de variante THE sistema de tipos SHALL fallar en compilación (variantes tipadas).
3. WHILE exista código legacy, THE librería SHALL convivir sin colisiones de estilos con las vistas no migradas.
