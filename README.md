# bot-plataform

Plataforma de bots conversacionales sobre **Evolution API** (WhatsApp) y **Chatwoot** (atención humana), desplegada en la infraestructura Dokploy gestionada desde [`cloud-manager`](../../). Repo independiente, montado como submódulo en `cloud-manager/projects/bot-plataform`.

## Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| **Backend** | [Hono](https://hono.dev) + TypeScript + [Drizzle ORM](https://orm.drizzle.team) | Ultraligero, rapidísimo, TS de punta a punta. |
| **Frontend** | [Vite](https://vitejs.dev) + React + [shadcn/ui](https://ui.shadcn.com) + Tailwind | SPA simple y veloz para el dashboard. |
| **Auth** | [Clerk](https://clerk.com) (managed) | Capa liviana, UI lista, MFA/social sin montar infra. |
| **DB** | Postgres `labs` compartido (Dokploy) | Reutiliza el recurso existente, DB `botplatform`. |
| **Cache** | Redis compartido (Dokploy), db index `5` | Mismo patrón que Evolution/Chatwoot/Postiz. |
| **Monorepo** | pnpm workspaces | Tipos compartidos entre backend y frontend. |

## Estructura

```
bot-plataform/
├── apps/
│   ├── backend/        # Hono API
│   │   └── src/
│   │       ├── index.ts          # entry + CORS + rutas
│   │       ├── env.ts            # validación de env (zod)
│   │       ├── db/               # drizzle: schema + client
│   │       ├── middleware/auth.ts # verificación de token Clerk
│   │       ├── routes/           # health, bots, webhooks
│   │       └── integrations/     # clientes Evolution + Chatwoot
│   └── frontend/       # Vite + React + shadcn
│       └── src/        # main, App (dashboard), lib/api (fetch + Clerk)
├── packages/
│   └── shared/         # tipos + schemas zod compartidos (contratos de API)
└── infra/
    └── dokploy/        # docker-compose + dokploy.json + README de despliegue
```

## Desarrollo local

```bash
pnpm install

# Copia y rellena los .env de cada app
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Backend (:3000) y frontend (:5173) en paralelo
pnpm dev
```

El frontend hace proxy de `/api` al backend en dev (ver `vite.config.ts`).

### Base de datos

```bash
pnpm db:generate   # genera migraciones desde apps/backend/src/db/schema.ts
pnpm db:migrate    # aplica migraciones (necesita DATABASE_URL)
```

## Despliegue

Todo el flujo de despliegue en Dokploy está en [`infra/dokploy/README.md`](./infra/dokploy/README.md): crear proyecto/compose, conectar GitHub, dominios (`bots.diegop.com`, `api.bots.diegop.com`), variables y webhooks.

## Integraciones

- **Evolution API** (`https://evolutionapi.diegop.com`, header `apikey`) — envío/recepción de WhatsApp. Cliente en `apps/backend/src/integrations/evolution.ts`.
- **Chatwoot** (`https://chatwoot.diegop.com`, header `api_access_token`) — escalado a agentes humanos. Cliente en `apps/backend/src/integrations/chatwoot.ts`.

Webhooks entrantes en `POST /webhooks/evolution` y `POST /webhooks/chatwoot` (protegidos por `WEBHOOK_SECRET`).
