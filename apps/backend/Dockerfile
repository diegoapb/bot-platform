# Build context = raíz del monorepo (ver infra/dokploy/docker-compose.yml)
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- deps + build ----
FROM base AS build
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @bot/backend build
# Poda devDependencies para producción
RUN pnpm --filter @bot/backend --prod deploy /app/deploy

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/deploy/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/index.js"]
