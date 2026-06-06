# Build context = raíz del monorepo (ver infra/dokploy/docker-compose.yml)
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app

# Variables VITE_* se hornean en build-time → llegan como build args.
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/
RUN pnpm install --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/frontend apps/frontend
RUN pnpm --filter @bot/frontend build

# ---- runtime: nginx estático ----
FROM nginx:1.27-alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
