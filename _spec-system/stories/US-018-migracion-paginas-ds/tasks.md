---
id: US-018
---

# Tasks — US-018 · Migración de páginas al design system

## Overview

Tres waves de migración (T1–T3 listados, T4–T5 detalle de bot, T6–T7 conversaciones y métricas) + auditoría final (T8).

## Tasks

- [ ] **T1 — BotsPage con cards del DS**
  - Archivos: `apps/frontend/src/pages/bots/BotsPage.tsx`
  - PASS si: grid de Card light con eyebrow/icon tile/tags; CTA Button primary; paridad funcional.
  - FAIL si: queda alguna clase de paleta genérica.
  - Requirements: 1.1, 3.1

- [ ] **T2 — TeamPage con el DS**
  - Archivos: `apps/frontend/src/pages/team/TeamPage.tsx`
  - PASS si: tabla/lista con tipografía y badges del DS; acciones ghost; paridad funcional.
  - Requirements: 1.4, 3.1

- [ ] **T3 — AdminPage (super admin) con el DS**
  - Archivos: `apps/frontend/src/pages/admin/AdminPage.tsx`
  - PASS si: listado de tenants y acciones de bloqueo con componentes del DS; paridad funcional.
  - Requirements: 1.4, 3.1

- [ ] **T4 — BotDetailPage: tab bar del DS**
  - Archivos: `apps/frontend/src/pages/bots/BotDetailPage.tsx`
  - PASS si: tabs mono uppercase con indicador lime; navegación intacta.
  - Requirements: 2.1

- [ ] **T5 — Migración de los 8 tabs del bot**
  - Archivos: `apps/frontend/src/pages/bots/ConnectWhatsApp.tsx`, `ChatwootSettings.tsx`, `IdentityEditor.tsx`, `KnowledgeManager.tsx`, `CatalogManager.tsx`, `ConversationsPanel.tsx`, `ContactsPanel.tsx`, `GenerationsLog.tsx`
  - PASS si: formularios con inputs del DS; estados vacío/carga/error estandarizados; QR legible en card; paridad funcional por tab.
  - FAIL si: algún flujo (conectar WhatsApp, subir conocimiento, etc.) cambia de comportamiento.
  - Requirements: 2.2, 2.3, 3.1

- [ ] **T6 — Conversaciones (lista + vista) con el DS**
  - Archivos: `apps/frontend/src/pages/conversations/ConversationsList.tsx`, `ConversationView.tsx`
  - PASS si: filas/burbujas con superficies del DS; badges de modo y origen; refetch y acciones de modo intactos.
  - Requirements: 1.2, 3.1

- [ ] **T7 — MetricsDashboard: StatTiles + theme de charts**
  - Archivos: `apps/frontend/src/pages/metrics/MetricsDashboard.tsx`, `apps/frontend/src/lib/chartTheme.ts`
  - PASS si: KPIs como StatTile; recharts con paleta de tokens; rangos 7/30d intactos.
  - Requirements: 1.3, 3.1

- [ ] **T8 — Auditoría de clases genéricas + revisión visual final**
  - Archivos: n/a (verificación; opcional `scripts/audit-ds.mjs`)
  - PASS si: grep de paleta genérica y hex hardcodeados sin matches fuera de los archivos permitidos; checklist visual por ruta aprobado en light/dark.
  - FAIL si: cualquier ruta sin revisión registrada.
  - Requirements: 3.2, 3.3
