#!/usr/bin/env bash
# Túnel SSH a la base de datos de desarrollo en Dokploy.
# Mapea localhost:LOCAL_PORT -> <DB de dev> en el host Dokploy.
# Déjalo abierto mientras desarrollas. Ver docs/GETTING-STARTED.md.
set -euo pipefail

SSH_ALIAS="${DOKPLOY_SSH:-dokploy}"   # alias en ~/.ssh/config
LOCAL_PORT="${LOCAL_PORT:-5432}"      # boca local (la que usa DATABASE_URL)
REMOTE_PORT="${REMOTE_PORT:-8680}"    # puerto en el host hacia la DB de dev
                                      #   8680 = proxy socat -> labs-vector (pgvector)  [ACTUAL]
                                      #   8679 = recurso botplatform-dev (postgres:15, sin pgvector)  [OBSOLETO]

echo "Túnel: localhost:${LOCAL_PORT} -> ${SSH_ALIAS}:localhost:${REMOTE_PORT}  (Ctrl-C para cerrar)"
exec ssh -N -L "${LOCAL_PORT}:localhost:${REMOTE_PORT}" "${SSH_ALIAS}"
