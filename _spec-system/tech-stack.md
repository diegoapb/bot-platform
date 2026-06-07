# Tech stack

> Versiones actuales. Cuando subas una mayor, deja una línea en `progress.md`.

## Monorepo

- **pnpm** 9 (workspaces: `apps/*`, `packages/*`)
- **Node** ≥ 20
- **TypeScript** 5.x

## Backend (`apps/backend`)

- **Hono** — framework HTTP.
- **Drizzle ORM** + **postgres** driver.
- **Clerk SDK** (`@clerk/backend`).
- **Zod** — validación de env.

## Frontend (`apps/frontend`)

- **Vite** 6 + **React** 18.
- **TanStack Query** 5.
- **React Router** 6.
- **Tailwind** 3 + **tailwindcss-animate** + componentes con `class-variance-authority`.
- **Clerk React** (`@clerk/clerk-react`).

## Infraestructura

- **Dokploy** — orquestador en VPS para Postgres dev/prod y despliegues.
- **Cloudflare** — DNS y tunnels (dev: `bot-dev.tusolvex.com`).
- **Evolution API** — Baileys-as-a-service para WhatsApp.
- **Chatwoot** — inbox conversacional.

## Tooling

- **ESLint** / **TypeScript-check** por workspace.
- **drizzle-kit** para migraciones.
