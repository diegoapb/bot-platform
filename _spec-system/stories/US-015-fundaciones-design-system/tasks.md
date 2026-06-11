---
id: US-015
---

# Tasks — US-015 · Fundaciones del design system

## Overview

Tokens CSS (T1), fuentes (T2), mapeo Tailwind (T3), verificación (T4). T1–T2 en paralelo; T3 depende de T1; T4 cierra.

## Tasks

- [ ] **T1 — Archivo de tokens CSS + surface-dark**
  - Archivos: `apps/frontend/src/styles/tokens.css`, `apps/frontend/src/index.css`
  - PASS si: todos los tokens del DS presentes con valores exactos; `.surface-dark` invierte fg/bg/line; importado antes de las capas Tailwind.
  - FAIL si: tokens duplicados en más de un archivo o valores divergentes del DS.
  - Requirements: 1.1, 1.2, 1.3

- [ ] **T2 — Carga de fuentes (Space Grotesk, DM Sans, Geist Mono)**
  - Archivos: `apps/frontend/package.json`, `apps/frontend/src/index.css`
  - PASS si: tres familias con los pesos del DS, `font-display: swap`, DM Sans como body por defecto.
  - FAIL si: fuentes cargadas por CDN bloqueante o pesos faltantes.
  - Requirements: 2.1, 2.2

- [ ] **T3 — Mapeo de tokens al theme de Tailwind**
  - Archivos: `apps/frontend/tailwind.config.js`
  - PASS si: `bg-forest`, `text-lime`, `font-display`, `text-h1`, `rounded-ds`, `shadow-ds-1`, `max-w-rail` compilan y resuelven a los tokens; escala default intacta.
  - FAIL si: se reemplaza el theme (rompe páginas sin migrar).
  - Requirements: 2.3, 3.1, 3.2, 3.3

- [ ] **T4 — Verificación visual y de build**
  - Archivos: n/a (verificación)
  - PASS si: build prod verde; valores computados coinciden con el DS; páginas actuales sin regresiones.
  - FAIL si: cualquier página existente cambia de aspecto inesperadamente.
  - Requirements: 3.3, 4.1, 4.2
