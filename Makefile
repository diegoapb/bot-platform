# ===========================================================================
# bot-plataform — entorno de desarrollo local (docker-compose.dev.yml).
# Atajos para levantar TODO el stack en tu máquina y cargar data de prueba.
#
#   make            -> ayuda
#   make up         -> bootstrap completo (build + levantar + migrar + seed)
#   make logs       -> seguir logs
#   make reset      -> DB limpia desde cero (borra volúmenes + migra + seed)
#
# Requisitos: Docker + (docker compose v2  ó  docker-compose).
# ===========================================================================

COMPOSE_FILE := docker-compose.dev.yml
ENV_FILE     := .env.dev
ENV_EXAMPLE  := .env.dev.example

# Autodetecta el binario de compose (plugin v2 preferido, fallback a v1).
DC := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")
COMPOSE := $(DC) -f $(COMPOSE_FILE)

# Servicio que ejecuta tareas one-shot (migrate/seed/typecheck): reusa el backend.
RUN := $(COMPOSE) run --rm --no-deps backend

.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
.PHONY: help
help: ## Muestra esta ayuda
	@echo "bot-plataform — entorno de desarrollo (compose: $(DC))"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ---- Ciclo de vida --------------------------------------------------------
.PHONY: env
env: ## Crea .env.dev (y apps/frontend/.env) desde los ejemplos si no existen
	@if [ ! -f $(ENV_FILE) ]; then \
		cp $(ENV_EXAMPLE) $(ENV_FILE); \
		echo "✓ Creado $(ENV_FILE) (revísalo: claves de Clerk/IA si las necesitas)"; \
	else \
		echo "✓ $(ENV_FILE) ya existe"; \
	fi
	@if [ ! -f apps/frontend/.env ]; then \
		cp apps/frontend/.env.example apps/frontend/.env; \
		echo "✓ Creado apps/frontend/.env (pon ahí tu VITE_CLERK_PUBLISHABLE_KEY)"; \
	else \
		echo "✓ apps/frontend/.env ya existe"; \
	fi

.PHONY: build
build: ## Construye la imagen de desarrollo
	$(COMPOSE) build

.PHONY: up
up: env ## Bootstrap completo: levanta el stack, migra y carga data de prueba
	$(COMPOSE) build
	$(MAKE) migrate
	$(MAKE) seed
	$(COMPOSE) up -d
	@echo ""
	@echo "🚀 Listo:"
	@echo "   Frontend  -> http://localhost:$${FRONTEND_PORT:-5173}"
	@echo "   Backend   -> http://localhost:$${BACKEND_PORT:-3000}/health"
	@echo "   Postgres  -> localhost:$${DB_PORT:-5433}  (user/db: botplatform)"

.PHONY: start
start: env ## Levanta el stack SIN migrar ni cargar data
	$(COMPOSE) up -d

.PHONY: up-infra
up-infra: env ## Levanta solo Postgres + Redis (para correr las apps en el host)
	$(COMPOSE) up -d db redis

.PHONY: down
down: ## Detiene el stack (conserva los datos)
	$(COMPOSE) down

.PHONY: down-v
down-v: ## Detiene el stack y BORRA los volúmenes (datos + node_modules)
	$(COMPOSE) down -v

.PHONY: restart
restart: ## Reinicia backend y frontend
	$(COMPOSE) restart backend frontend

.PHONY: ps
ps: ## Estado de los servicios
	$(COMPOSE) ps

# ---- Base de datos --------------------------------------------------------
.PHONY: wait-db
wait-db: ## Espera a que Postgres acepte conexiones
	@echo "⏳ Esperando a Postgres…"
	@until $(COMPOSE) exec -T db pg_isready -U botplatform -d botplatform >/dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "✅ Postgres listo"

.PHONY: migrate
migrate: up-infra wait-db ## Aplica las migraciones (una tx por archivo; ver scripts/migrate-local.ts)
	$(RUN) pnpm --filter @bot/backend db:migrate-local

.PHONY: seed
seed: up-infra wait-db ## Carga (o recarga, idempotente) la data de prueba
	$(RUN) pnpm --filter @bot/backend db:seed

.PHONY: reseed
reseed: seed ## Alias de `seed` (la carga es idempotente)

.PHONY: reset
reset: ## DB limpia desde cero: borra volúmenes, levanta, migra y siembra
	$(COMPOSE) down -v
	$(MAKE) up

.PHONY: psql
psql: ## Abre psql interactivo en el contenedor db
	$(COMPOSE) exec db psql -U botplatform -d botplatform

# ---- Utilidades -----------------------------------------------------------
.PHONY: logs
logs: ## Sigue los logs de todos los servicios
	$(COMPOSE) logs -f

.PHONY: logs-backend
logs-backend: ## Sigue los logs del backend
	$(COMPOSE) logs -f backend

.PHONY: logs-frontend
logs-frontend: ## Sigue los logs del frontend
	$(COMPOSE) logs -f frontend

.PHONY: shell-backend
shell-backend: ## Abre una shell en el contenedor backend
	$(COMPOSE) exec backend sh

.PHONY: shell-frontend
shell-frontend: ## Abre una shell en el contenedor frontend
	$(COMPOSE) exec frontend sh

.PHONY: typecheck
typecheck: ## Corre typecheck del workspace dentro del contenedor
	$(RUN) pnpm -r typecheck

.PHONY: clean
clean: ## Baja todo, borra volúmenes e imagen de desarrollo
	$(COMPOSE) down -v --rmi local
