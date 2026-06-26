#!/usr/bin/env bash
# ===========================================================================
# Entrypoint de los contenedores de desarrollo (backend/frontend).
# Instala las dependencias del workspace dentro de los volúmenes node_modules
# la primera vez (o cuando cambia el lockfile) y luego ejecuta el comando del
# servicio. Así el `pnpm install` se hace una vez y los reinicios son instantáneos.
# ===========================================================================
set -euo pipefail

cd /app

STAMP="node_modules/.dev-install-stamp"

# Reinstala si no hay stamp o si el lockfile es más nuevo que la última install.
if [ ! -f "$STAMP" ] || [ "pnpm-lock.yaml" -nt "$STAMP" ]; then
  echo "▶ Instalando dependencias del workspace (pnpm)… (solo la primera vez / al cambiar el lockfile)"
  pnpm install --frozen-lockfile=false
  mkdir -p node_modules
  touch "$STAMP"
else
  echo "✓ Dependencias ya instaladas (omito pnpm install)"
fi

echo "▶ Ejecutando: $*"
exec "$@"
