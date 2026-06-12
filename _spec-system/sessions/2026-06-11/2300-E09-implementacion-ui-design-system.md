---
date: 2026-06-11
start: "23:00"
end: "23:45"
epic: E09
stories: []
agent: claude-opus-4-8
participants: [@diego]
tags: [design-system, frontend, tailwind, ui-kit, open-solvex]
---

# Implementación de la nueva UI alineada al Open Solvex Design System

> Nota: la hora de inicio es aproximada — se infiere del primer mensaje del chat,
> no de un timestamp exacto.

## Resumen ejecutivo
- Se implementó la épica **E09** completa en `apps/frontend`: tokens del DS como CSS
  variables + mapeo a Tailwind, carga de las tres familias tipográficas, librería de
  componentes UI reutilizables, rediseño del layout global y migración visual de **todas**
  las páginas y sub-vistas.
- Se construyó una librería de componentes en `src/components/ui/` (Button, Card, Badge,
  Field/Input/Textarea/Select, Eyebrow, StatTile, PageHeader, Tabs, Feedback, Logo) con
  variantes vía `cva` y documentadas con JSDoc.
- Migradas las 16 vistas: BotsPage, BotDetail (+8 tabs), Conversaciones (lista + detalle),
  Métricas, Equipo, Plataforma/Admin, y los sub-paneles de bot.
- `pnpm typecheck` y `pnpm build` pasan en verde. Grep confirma que no quedan colores ni
  tokens hardcodeados (shadcn `bg-primary`, `muted-foreground`, `text-red-*`, hex sueltos)
  fuera de la definición de tokens en `index.css`.
- Pendiente: revisión visual side-by-side en navegador contra el DS (no ejecutada en esta
  sesión) y, opcionalmente, code-splitting para el aviso de chunk > 500 kB (preexistente).

## Contexto inicial
El usuario pidió implementar la nueva UI propuesta en la épica
`_spec-system/epics/E09-alineacion-design-system.md`, con foco en una UI moderna, limpia y
con buenas prácticas, usando como referencia el design system en
`_spec-system/knowledge-base/OpenSolvexDesignSystem`.

## Épica y stories tocadas
- **Épica**: E09 — Alineación de la UI al Open Solvex Design System
- **Stories**: ninguna historia formal (`US-*`) referenciada; el trabajo se ejecutó a nivel
  de criterios de salida de la épica.

Criterios de salida cubiertos:
- [x] Sin color/tipografía/sombra hardcodeada fuera de los tokens del DS en `apps/frontend`.
- [x] Las tres fuentes del DS cargadas y aplicadas (display, body, mono).
- [x] Componentes UI base con variantes documentadas y usados por todas las páginas.
- [x] Todas las páginas migradas visualmente.
- [ ] Revisión visual side-by-side contra el DS (pendiente de hacer en navegador).

## Decisiones tomadas
1. **Tokens como CSS variables + mapeo a Tailwind** — `index.css` es la única fuente de
   verdad de color/tipografía/spacing; `tailwind.config.js` referencia esas vars. Permite el
   override `[data-surface="dark"]` (superficie forest) sin duplicar clases.
2. **Eliminar los tokens shadcn por defecto** (`--primary`, `--muted`, etc.) en lugar de
   solo re-mapearlos, para garantizar adherencia estricta y detectar usos viejos por grep.
3. **Librería propia en `src/components/ui/`** con `class-variance-authority` (ya en deps),
   en vez de traer una librería externa — más control sobre las variantes del DS.
4. **Paleta funcional restringida** (`ok/warn/danger/info`) añadida como tokens para badges
   de estado, ya que el DS solo define lime como acento y se necesitaban estados semánticos.
5. **Recharts y burbujas de chat tokenizados** — fills vía `var(--…)` y `text-beige` en vez
   de hex, para no dejar colores crudos.
6. **Logos del DS copiados a `public/brand/`** (mark-lime, mark-forest, lockups) y componente
   `Logo` que alterna marca según superficie.

## Cambios en el repo
Creados:
- `apps/frontend/src/components/ui/`: `Button.tsx`, `Card.tsx`, `Badge.tsx`, `Field.tsx`,
  `Eyebrow.tsx`, `StatTile.tsx`, `PageHeader.tsx`, `Tabs.tsx`, `Feedback.tsx`, `Logo.tsx`,
  `index.ts` (barrel).
- `apps/frontend/public/brand/`: `mark-lime.svg`, `mark-forest.svg`, `logo-on-forest.svg`,
  `logo-forest-on-light.svg` (copiados del knowledge-base).

Modificados:
- `apps/frontend/src/index.css` — reescrito como sistema de tokens del DS + base typográfica
  + utilidades (`.ds-eyebrow`, `.ds-display`, `.ds-dotgrid`).
- `apps/frontend/tailwind.config.js` — theme mapeado a tokens (colores, fuentes, radios,
  sombras `e1/e2/e3/glow`, `max-w-rail` 1240px).
- `apps/frontend/src/components/Layout.tsx` — header sticky con blur, rail centrado, logo,
  nav con hover/active lime.
- `apps/frontend/src/App.tsx` — landing rediseñada sobre superficie forest; gates con
  `Loading`.
- Páginas migradas: `BotsPage`, `bots/BotDetailPage`, `bots/ConnectWhatsApp`,
  `bots/ChatwootSettings`, `bots/AudienceSettings`, `bots/IdentityEditor`,
  `bots/KnowledgeManager`, `bots/CatalogManager`, `bots/ConversationsPanel`,
  `bots/ContactsPanel`, `bots/GenerationsLog`, `conversations/ConversationsList`,
  `conversations/ConversationView`, `metrics/MetricsDashboard`, `TeamPage`, `AdminPage`.

Commits: ninguno generado en esta sesión (cambios en working tree, sin `git commit`).

## Pendientes / próximos pasos
- [ ] Revisión visual side-by-side en navegador contra los screenshots/preview del DS.
- [ ] Verificar render de OrganizationSwitcher/UserButton de Clerk sobre la nueva paleta
      (componentes de terceros, no tokenizados por nosotros).
- [ ] Opcional: code-splitting por ruta para el aviso de chunk > 500 kB (preexistente).
- [ ] Commit + PR de los cambios cuando el usuario lo indique.

## Bloqueos
Ninguno técnico. Falta validación visual humana antes de dar por cerrada la épica.

## Referencias
- Épica: `_spec-system/epics/E09-alineacion-design-system.md`
- Knowledge base: `_spec-system/knowledge-base/OpenSolvexDesignSystem/` (README.md,
  colors_and_type.css, assets/)
- **Conversación completa**: archivo hermano `HHMM-RAW-*.md` que generará el hook
  `SessionEnd` al cerrar la sesión (misma carpeta).
