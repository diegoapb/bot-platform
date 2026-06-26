-- ===========================================================================
-- Inicialización de la base de datos de DESARROLLO (se ejecuta UNA sola vez,
-- en el primer arranque del contenedor `db`, cuando el volumen está vacío).
--
-- El schema de la app usa columnas `vector(1536)` + índice HNSW (pgvector), así
-- que la extensión DEBE existir antes de correr las migraciones. La imagen
-- `pgvector/pgvector:pg15` ya trae la extensión compilada; aquí solo la
-- habilitamos en la base `botplatform`.
-- ===========================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- `gen_random_uuid()` es core desde Postgres 13, pero dejamos pgcrypto por si
-- alguna utilidad lo necesita explícitamente.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
