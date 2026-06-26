# ===========================================================================
# Imagen de DESARROLLO para backend y frontend (hot-reload).
# A diferencia de los Dockerfiles de prod (apps/*/Dockerfile), aquí NO se
# hornea el código: el repo se monta como bind-mount y las dependencias viven
# en volúmenes node_modules (ver docker-compose.dev.yml). El entrypoint corre
# `pnpm install` la primera vez y luego ejecuta el comando del servicio
# (tsx watch para backend, vite para frontend).
# Build context = raíz del repo.
# ===========================================================================
FROM node:20-alpine

# bash para el entrypoint; libc6-compat por si algún binario lo necesita.
RUN apk add --no-cache bash libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Cache del store de pnpm fuera de node_modules (se persiste por volumen).
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN pnpm config set store-dir /pnpm/store

COPY infra/dev/entrypoint.sh /usr/local/bin/dev-entrypoint
RUN chmod +x /usr/local/bin/dev-entrypoint

ENTRYPOINT ["/usr/local/bin/dev-entrypoint"]
# Comando por defecto: backend. El servicio frontend lo sobrescribe.
CMD ["pnpm", "--filter", "@bot/backend", "exec", "tsx", "watch", "src/index.ts"]
