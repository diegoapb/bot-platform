---
id: US-015
flow: feature
---

# Design — US-015 · Fundaciones del design system

## Overview

Copiar/adaptar `colors_and_type.css` del knowledge-base a `apps/frontend/src/styles/tokens.css`, importarlo desde `index.css` antes de las capas de Tailwind, cargar las tres fuentes (preferencia: self-hosted vía `@fontsource`), y extender `tailwind.config.js` para mapear tokens a utilidades (`colors`, `fontFamily`, `fontSize`, `borderRadius`, `boxShadow`, `transitionTimingFunction`, `maxWidth`). Sin cambios de componentes ni páginas.

## Architecture

```mermaid
flowchart LR
  DS[knowledge-base/OpenSolvexDesignSystem/colors_and_type.css] -->|fuente de verdad| TOK[src/styles/tokens.css]
  TOK --> IDX[src/index.css]
  TOK -->|var(--token)| TW[tailwind.config.js theme.extend]
  FONTS[@fontsource: Space Grotesk, DM Sans, Geist Mono] --> IDX
  TW --> APP[componentes y páginas]
```

## Components and Interfaces

### `apps/frontend/src/styles/tokens.css`
- `:root { … }` con todos los tokens del DS (colores, líneas, sombras, radios, `--s-*`, `--fs-*`, `--ease-out`, `--t-*`, `--maxw`, `--pad-x`).
- `.surface-dark { … }` con la inversión de tokens del DS. Cubre 1.1–1.3.

### Fuentes — `apps/frontend/package.json` + `index.css`
- `@fontsource/space-grotesk` (500), `@fontsource/dm-sans` (400/500/600), `@fontsource/geist-mono` (400/500); imports en `index.css`. Cubre 2.1.
- `body { font-family: 'DM Sans', … }` en capa base. Cubre 2.2.

### `apps/frontend/tailwind.config.js`

```js
theme: {
  extend: {
    colors: { forest: 'var(--forest)', lime: 'var(--lime)', beige: 'var(--beige)', /* graphite-1..3, surfaces, line-* */ },
    fontFamily: { display: ['Space Grotesk', …], body: ['DM Sans', …], mono: ['Geist Mono', …] },
    fontSize: { display: 'var(--fs-display)', h1: 'var(--fs-h1)', h2: 'var(--fs-h2)', /* h3, h4, lede, body, small, caption, eyebrow */ },
    borderRadius: { 'ds-sm': 'var(--r-sm)', ds: 'var(--r)', 'ds-lg': 'var(--r-lg)', pill: 'var(--r-pill)' },
    boxShadow: { 'ds-1': 'var(--shadow-1)', 'ds-2': 'var(--shadow-2)', 'ds-3': 'var(--shadow-3)', glow: 'var(--glow-lime)' },
    transitionTimingFunction: { 'ds-out': 'var(--ease-out)' },
    transitionDuration: { fast: '200ms', base: '250ms', slow: '350ms' },
    maxWidth: { rail: 'var(--maxw)' },
  }
}
```
Cubre 3.1–3.3 (extend, no replace).

## Data Models

N/A (solo estilos).

## Error Handling

- Fallback de fuentes: stacks de sistema por familia; `font-display: swap` evita FOIT.
- Tokens ausentes: ninguna utilidad nueva sin token definido (lint visual en review).

## Testing Strategy

- Build de producción verde (`pnpm build` del frontend).
- Inspección manual de valores computados de `--forest`, `--lime`, `--fs-h1` contra el DS (Req 4.1).
- Smoke visual de páginas existentes sin migrar: sin regresiones (Req 3.3).
