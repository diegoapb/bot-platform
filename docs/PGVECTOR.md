# pgvector — conexión desde bot-platform

Bot-platform puede usar **pgvector** a través de la instancia Postgres compartida
`labs-vector` que corre en el host Dokploy (imagen `pgvector/pgvector:pg15`,
extensión `vector 0.8.2` ya habilitada).

## Datos de conexión

| Campo | Valor |
|---|---|
| Host interno (red Docker `dokploy-network`) | `labs-vector-uvatca` |
| Puerto interno | `5432` |
| Usuario | `chatwoot` |
| Password | `d66bd6df5122b11f5924ab846936a53f1c49d1735ca6ef4c` |
| Database | `chatwoot` |
| Extensión | `vector 0.8.2` (ya instalada con `CREATE EXTENSION`) |

URL interna (para servicios desplegados en Dokploy, mismo `dokploy-network`):

```
postgresql://chatwoot:d66bd6df5122b11f5924ab846936a53f1c49d1735ca6ef4c@labs-vector-uvatca:5432/chatwoot
```

> ⚠️ Esta instancia y la database `chatwoot` las usa también Chatwoot en
> producción. Para aislar los datos de bot-platform conviene crear una database
> propia dentro de la misma instancia (ver [Database dedicada](#database-dedicada-recomendado)).

## Conexión desde local (túnel SSH)

`labs-vector` **no publica ningún puerto en el host** (a diferencia de
`botplatform-dev`, que expone el 8679). Para hacerlo alcanzable sin tocar la DB
existe un proxy `socat` corriendo en el host Dokploy:

```
contenedor: pgvector-proxy  (alpine/socat, --restart unless-stopped)
escucha:    127.0.0.1:8680 del host  →  labs-vector-uvatca:5432
```

Como escucha solo en `127.0.0.1`, no es accesible desde internet (Cloudflare
tampoco lo permitiría); la única vía es el túnel SSH — el mismo patrón que
`scripts/dev-tunnel.sh`.

### Opción 1 — con dev-tunnel.sh

```bash
LOCAL_PORT=5433 REMOTE_PORT=8680 ./scripts/dev-tunnel.sh
```

### Opción 2 — ssh directo

```bash
ssh -N -L 5433:localhost:8680 dokploy
```

Con el túnel abierto, desde tu máquina:

```bash
PGPASSWORD=d66bd6df5122b11f5924ab846936a53f1c49d1735ca6ef4c \
  psql -h localhost -p 5433 -U chatwoot -d chatwoot
```

URL local (DATABASE_URL de desarrollo):

```
postgresql://chatwoot:d66bd6df5122b11f5924ab846936a53f1c49d1735ca6ef4c@localhost:5433/chatwoot
```

> Se usa `5433` local para no chocar con el túnel habitual de la DB de dev
> (`5432 → 8679`). Ambos túneles pueden estar abiertos a la vez.

### Verificar pgvector

```sql
SELECT extversion FROM pg_extension WHERE extname = 'vector';
-- 0.8.2

SELECT '[1,2,3]'::vector <-> '[3,2,1]'::vector AS distancia;
```

## Database dedicada (recomendado)

Para no mezclar datos con Chatwoot, crear una database propia en la misma
instancia (una sola vez, vía SSH al host):

```bash
ssh dokploy "docker exec \$(docker ps -q -f name=labs-vector) \
  psql -U chatwoot -c \"CREATE DATABASE botplatform_vectors OWNER chatwoot;\""
ssh dokploy "docker exec \$(docker ps -q -f name=labs-vector) \
  psql -U chatwoot -d botplatform_vectors -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
```

Y usar como URL (por túnel): `postgresql://chatwoot:...@localhost:5433/botplatform_vectors`

## Mantenimiento del proxy

El proxy sobrevive a reinicios del host (`--restart unless-stopped`). Si dejara
de responder:

```bash
# estado
ssh dokploy "docker ps -f name=pgvector-proxy"
# recrearlo
ssh dokploy "docker rm -f pgvector-proxy; docker run -d --name pgvector-proxy \
  --restart unless-stopped --network dokploy-network -p 127.0.0.1:8680:5432 \
  alpine/socat tcp-listen:5432,fork,reuseaddr tcp-connect:labs-vector-uvatca:5432"
```

> Nota: el contenedor `pgvector-proxy` se creó con `docker run` directo en el
> host; Dokploy no lo gestiona y no aparece en su panel.
