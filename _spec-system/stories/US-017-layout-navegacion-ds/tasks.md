---
id: US-017
---

# Tasks — US-017 · Layout global y navegación

## Overview

Header + nav (T1), rail y superficies (T2), Clerk appearance (T3), gates/loaders (T4), QA responsive (T5).

## Tasks

- [ ] **T1 — Header dark con nav mono y acento lime**
  - Archivos: `apps/frontend/src/components/Layout.tsx`
  - PASS si: superficie forest, nav Geist Mono uppercase, ítem activo lime, hairline `--line-dark`; menú colapsable < 768px.
  - FAIL si: colores fuera de tokens o nav inaccesible por teclado.
  - Requirements: 1.1, 1.2, 1.4

- [ ] **T2 — Rail de contenido 1240px + sistema de superficies**
  - Archivos: `apps/frontend/src/components/Layout.tsx`
  - PASS si: `max-w-rail` + `--pad-x` fluido; superficie beige default y opción dark por página; páginas legacy renderizan sin romperse.
  - FAIL si: overflow horizontal en cualquier ruta existente.
  - Requirements: 2.1, 2.2, 2.3

- [ ] **T3 — Appearance de Clerk (org switcher, user button)**
  - Archivos: `apps/frontend/src/lib/clerkAppearance.ts`, `apps/frontend/src/components/Layout.tsx`
  - PASS si: widgets legibles y coherentes sobre header forest; popovers con tokens del DS.
  - FAIL si: popovers ilegibles en dark.
  - Requirements: 1.3

- [ ] **T4 — Gates y estados de carga con el DS**
  - Archivos: `apps/frontend/src/App.tsx`, componentes de gate
  - PASS si: TenantGate/SuperAdminGate/login usan Card/Button/Eyebrow; loader con pulso lime.
  - FAIL si: queda algún spinner/estilo genérico previo.
  - Requirements: 3.1, 3.2

- [ ] **T5 — QA responsive del shell**
  - Archivos: n/a (verificación)
  - PASS si: 360/768/1240/1600px sin defectos; todas las rutas smoke-tested.
  - FAIL si: regresión en cualquier página no migrada.
  - Requirements: 1.4, 2.3
