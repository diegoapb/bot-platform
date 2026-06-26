---
date: 2026-06-18
title: Infraestructura de agentes como código (Agent-as-Code) y gestión segura de secretos
author: Claude (Opus 4.8) — sesión con @diego
epic: E15 (propuesta)
tags: [iac, agents-as-code, declarative, secrets, openbao, infisical, vault, e13, e14]
status: draft
---

# Infraestructura de agentes como código (Agent-as-Code)

> Documento de entendimiento previo a épica. Captura la visión, el estado actual del código,
> las decisiones del cuestionario del 2026-06-18 y el modelo objetivo para que la plataforma
> pueda **recibir un manifiesto declarativo (YAML) y montar todos los agentes de un tenant**
> —identidad, conocimiento, modelo y ruteo— **inyectando variables y secretos almacenados de
> forma segura** en un gestor externo.
>
> Depende de **E13** (entidad agente, N:M canal↔agente, biblioteca de conocimiento) y **E14**
> (ruteo multi-agente por reglas declarativas). Sirve de base para redactar la épica **E15**.
> Referencia previa: `research/2026-06-18-desacople-agentes-canales.md`.

## 1. Visión

Hoy un tenant se configura **a mano, recurso por recurso, desde la UI**: crea el agente, escribe
su identidad, sube conocimiento, asigna canales, y (con E14) arma sus reglas de ruteo. Queremos que
todo eso sea **reproducible y versionable como código**: el tenant (o nosotros por él) entrega un
`agentpack.yaml` y la plataforma **reconcilia** ese estado deseado contra la base de datos en una
sola operación idempotente —crea lo que falta, actualiza lo que cambió, deja lo que ya está—. El
mismo manifiesto aplicado dos veces produce el mismo resultado; aplicado en otro entorno (qa→prod)
reproduce la misma configuración.

Los **secretos no viven en el manifiesto**: el YAML solo los **referencia** por nombre
(`${secrets.ANTHROPIC_API_KEY}`); los valores se cargan aparte y se guardan **cifrados en un gestor
de secretos externo**, nunca en nuestra base ni en git ni en logs.

### Objetivos

1. **Declarar** un tenant completo (agentes, identidad, conocimiento, modelo, canales referenciados,
   reglas de ruteo, orquestador) en un único documento legible y versionable.
2. **Aplicar** ese documento de forma **idempotente** (`apply`), con un **plan/diff** previo (`dryRun`).
3. **Inyectar variables** (no sensibles) y **secretos** (sensibles) por **referencia**, resolviéndolos
   **en runtime** desde un gestor externo, con **aislamiento por tenant**.
4. **Migrar** los secretos que hoy están en texto plano (`channels.credentials`, webhook tokens) al
   gestor seguro.

### No-objetivos (Fase 1, ver §4)

- Crear/conectar canales desde el YAML (QR de WhatsApp/Evolution, OAuth de Meta requieren handshake
  fuera de banda). El manifiesto **referencia** canales ya conectados, no los provisiona.
- Reemplazar la UI: el YAML es una **vía alternativa**, no excluyente. La UI de E13/E14 sigue.
- Gestión cross-tenant o "marketplace" de agentes. Todo es intra-tenant.

## 2. Estado actual (código)

Stack: **Hono** + **Drizzle ORM** + **PostgreSQL (pgvector)** · **Clerk** (multitenancy por
Organizations) · **Evolution API** (WhatsApp) · **Chatwoot** (inbox) · **Anthropic** (LLM) +
**OpenAI** (embeddings). Monorepo pnpm (`apps/backend`, `apps/frontend`, `packages/shared`).

### 2.1 El modelo ya es declarativo e idempotente (gracias a E13/E14)

Tras E13/E14, el modelo de datos (`apps/backend/src/db/schema.ts`) tiene exactamente las propiedades
que exige una infra-as-code, **sin que ese fuera su objetivo**:

| Propiedad | Evidencia en el schema |
|---|---|
| **Declarativo** | Entidades + relaciones N:M (`agent_channels`, `agent_knowledge_collections`) + reglas de ruteo como **árbol JSON** (`routing_rules.condition`, DSL cerrado de US-036). |
| **Idempotente** | `unique` por todos lados (`agents_legacy_bot_uq`, `agent_channels_*_uq`, `contacts_agent_identifier_uq`…) + `ON CONFLICT DO NOTHING` + migraciones idempotentes (decisión D5 de E13) + "referencia viva" del conocimiento (US-032). |
| **Aislado por tenant** | Toda tabla lleva `tenant_id` (Clerk org) y toda query filtra por él. Frontera de seguridad consistente. |
| **Versionado** | `identity_documents` es append-only (`version = max+1` por `(agent_id, type)`). |

Entidades raíz que el manifiesto deberá declarar: `agents`, `identity_documents`,
`knowledge_collections` (+ `knowledge_sources`), `agent_knowledge_collections`, `agent_channels`,
`routing_rules`, `channel_orchestrators`, `channels.default_agent_id`.

### 2.2 Cómo se manejan los secretos HOY (el problema)

Dos hallazgos confirmados, ambos accionables:

1. **Secretos globales de plataforma** → variables de entorno validadas con Zod en
   `apps/backend/src/env.ts`: `DATABASE_URL`, `CLERK_*`, `EVOLUTION_API_URL`/`EVOLUTION_API_KEY`,
   `CHATWOOT_*`, `WEBHOOK_SECRET`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_MODEL`, etc. Las
   integraciones (Evolution, Chatwoot, LLM, embeddings) son **una sola cuenta de plataforma para
   todos los tenants**; no hay credenciales por-tenant.

2. **Secretos por-tenant/canal** → **en texto plano**:
   - `channels.credentials` (`jsonb $type<Record<string,string>>`) guarda `botToken` de Telegram,
     `pageAccessToken`/`apiKey` de Meta, etc. **Sin cifrar.**
   - Webhook tokens (`bots.chatwootWebhookToken`, `tenants.chatwootAccountWebhookToken`,
     `bots.chatwootInboxIdentifier`) → texto plano.
   - **No hay** `crypto`/`libsodium`/KMS/vault en `package.json`. `randomUUID()` se usa solo para
     generar IDs de webhook, no para cifrar.

   Atenuante existente (bueno conservarlo): las credenciales **nunca se devuelven al frontend**
   (`routes/channels.ts` omite `credentials` en el DTO).

**Conclusión:** "almacenar secretos de forma segura" no es un añadido del manifiesto; es un
**prerrequisito** que hoy no existe. La pieza de secretos (§5.4) debería ir **antes o junto** con el
reconciliador, no después.

## 3. La brecha: qué falta para "envío un YAML y se monta todo"

| Falta | Detalle |
|---|---|
| **Identidad lógica estable** | Las FK son UUIDs generados. Un YAML necesita nombrar `agent: garantias` y que el reconciliador resuelva/cree el UUID. → añadir una columna `key`/`slug` única por `(tenant, recurso)` a las entidades raíz. |
| **Manifiesto + validador** | No existe formato ni esquema. Reutilizable: el `Condition` de E14 ya está tipado y se valida con `compileCondition`. |
| **Motor `apply`/`plan`** | No existe. Debe diffear estado deseado vs actual, aplicar en transacción, y reportar acciones manuales (handshakes). |
| **Gestión segura de secretos** | No existe cifrado en reposo (§2.2). |
| **Recursos no declarativos** | Conexión WhatsApp/Evolution (QR) y Meta (OAuth) requieren handshake fuera de banda → fuera de Fase 1 (canales solo referenciados). |

## 4. Decisiones tomadas (cuestionario 2026-06-18)

| # | Decisión | Elección | Implicación |
|---|---|---|---|
| 1 | Estrategia de cifrado de secretos | **Secret manager externo** (no cifrado app-level) | Integramos un gestor dedicado (OpenBao/Infisical), no implementamos AES nosotros. +1 servicio en el VPS. |
| 2 | Relación secretos ↔ manifiesto | **Referenciados, fuera del YAML** | El YAML solo lleva `${secrets.X}`; los valores se cargan por API/UI/CLI. Manifiesto 100% versionable en git. |
| 3 | Alcance del primer corte | **Solo plano declarativo puro** | Fase 1 = agentes + identidad + conocimiento + ruteo/orquestador. Canales se **referencian**, se conectan aparte. |
| 4 | Entregable de la sesión | **Solo este research doc** | No se crea la épica E15 todavía; §9 deja su descomposición sugerida. |

## 5. Modelo objetivo (propuesta)

### 5.1 El manifiesto `agentpack.yaml`

Un documento por tenant. Referencias entre recursos por **`key` lógico** (no UUID). Identidad y
conocimiento por contenido inline **o** por `path` a archivo (para versionar el prompt y la KB junto
al manifiesto). Secretos/variables por interpolación.

```yaml
version: 1
tenant: acme                       # validado contra la Clerk org del token; informativo

vars:                              # variables NO sensibles, interpoladas en el manifiesto
  llm_model: claude-haiku-4-5-20251001

# --- Conocimiento: colecciones reutilizables (US-032) ---
knowledge:
  - key: faq-tecnica
    name: "FAQ técnica"
    sources:
      - { kind: file, title: "FAQ", path: ./kb/faq.md }
      - { kind: text, title: "Política de devoluciones", path: ./kb/devoluciones.md }

# --- Agentes: el "cerebro" (US-030) ---
agents:
  - key: garantias
    name: "Garantías"
    status: active
    model: ${vars.llm_model}       # null/omitido => env.LLM_MODEL global
    identity:                       # versiona identity_documents (US-030)
      soul:       ./identity/garantias.soul.md
      identity:   ./identity/garantias.identity.md
      guardrails: "Escala a humano si detectas frustración o pides datos de pago."
    knowledge: [faq-tecnica]        # enlaza colecciones por key (referencia viva)
    extractionSchema: ./schemas/garantias.json   # opcional (E12)

  - key: preventa
    name: "Información de productos"
    status: active
    knowledge: [faq-tecnica]

# --- Canales: SOLO referencia (Fase 1, decisión D3). No se crean aquí. ---
channels:
  - key: wa-soporte                 # debe existir y estar conectado previamente
    # type/credenciales NO van aquí: el canal ya fue conectado por la UI

    # --- Ruteo multi-agente del canal (E14) ---
    routing:
      agents: [garantias, preventa]         # candidatos del canal (agent_channels N:M)
      default: preventa                      # channels.default_agent_id
      rules:                                 # routing_rules, evaluadas por priority asc
        - key: post-venta-a-garantias
          priority: 10
          enabled: true
          when:                              # === DSL de routing_rules.condition (US-036) ===
            op: and
            of:
              - { op: eq, field: { var: stage }, value: post_sale }
              - { op: exists, field: { var: fact, key: numero_compra } }
          agent: garantias
      orchestrator:                          # channel_orchestrators (US-037)
        enabled: true
        instructions: "Si ninguna regla aplica, elige según la etapa y el último mensaje."
        candidates: [garantias, preventa]
```

**Mapeo manifiesto → tablas:**

| Bloque YAML | Tabla(s) destino | Identidad de reconciliación |
|---|---|---|
| `knowledge[]` | `knowledge_collections` (+ `knowledge_sources`/`chunks`) | `(tenant, key)` |
| `knowledge[].sources[]` | `knowledge_sources` + ingestión (chunk+embed) | hash del contenido (reingesta solo si cambió) |
| `agents[]` | `agents` | `(tenant, key)` |
| `agents[].identity.*` | `identity_documents` (append-only) | nueva versión **solo si el contenido difiere** del vigente |
| `agents[].knowledge[]` | `agent_knowledge_collections` (N:M) | `(agent, collection)` |
| `channels[].routing.agents[]` | `agent_channels` (N:M) | `(agent, channel)` |
| `channels[].routing.default` | `channels.default_agent_id` | columna |
| `channels[].routing.rules[]` | `routing_rules` | `(channel, key)` |
| `channels[].routing.rules[].when` | `routing_rules.condition` | `compileCondition()` valida (US-036) |
| `channels[].routing.orchestrator` | `channel_orchestrators` | `channel_id` (1:1) |

### 5.2 Identidad lógica (`key`/`slug`)

Cada entidad raíz declarable gana una columna `key text NOT NULL` con `unique(tenant_id, key)`.
- El manifiesto referencia por `key`; el reconciliador resuelve `key → UUID` (upsert).
- La migración de E13/E14 puede derivar `key` del `name` (slugificado) para no romper lo existente.
- Permite `apply` repetible y reproducible entre entornos sin conocer UUIDs.
- Recursos no nombrados en un nuevo `apply` → política de borrado configurable (`prune: false` por
  defecto; nunca borrar implícitamente en Fase 1).

### 5.3 El reconciliador (`apply` / `plan`)

Endpoint `POST /api/iac/apply` (rol `org:admin`), cuerpo = YAML (o JSON). Pasos:

1. **Parse + validación** (Zod). El bloque `when` se compila con `compileCondition` (US-036). Falla
   rápido con errores localizados (línea/recurso).
2. **Resolución de referencias**: `vars`/`secrets` interpolados; `key → UUID` (upsert por tenant);
   verificación de que cada `${secrets.X}` **existe en el gestor** (HEAD/metadata) → si falta un
   secreto, **aborta antes de tocar la DB** (no deja agentes a medias).
3. **Plan (diff)**: calcula `create` / `update` / `noop` / (opcional) `delete` por recurso.
   Con `?dryRun=true` devuelve el plan **sin aplicar** — reutiliza la idea del **simulador de ruteo
   de US-039** y da un "terraform plan" para agentes.
4. **Apply transaccional**: una transacción Drizzle; respeta los invariantes ya definidos en E14
   (destino de regla ∈ candidatos del canal; `default` ∈ candidatos; etc.).
5. **Handshakes pendientes**: si un canal referenciado no está conectado, **no falla**: lo marca
   `pending` y lo devuelve como **acción manual** ("conecta wa-soporte escaneando el QR").

Idempotencia fina (clave): identidad y conocimiento son append-only/costosos, así que el `apply`
**no** crea versiones ni reingesta si el contenido no cambió (compara por hash). Aplicar el mismo
YAML dos veces ⇒ segundo `apply` = todo `noop`.

### 5.4 Gestión de secretos y variables (la pieza nueva)

Decisión D1: **gestor de secretos externo**. Investigación del estado actual (2025-2026):

| Opción | Licencia | Multi-tenant OSS | Stack/Operación | Veredicto para este proyecto |
|---|---|---|---|---|
| **Infisical** | **MIT** (núcleo; `ee/` comercial) | "project por tenant" + RBAC + machine identities | **TypeScript** (96.8%), **Postgres** + Redis, Docker Compose, SDK Node, UI lista | **Recomendado primario**: afín al equipo (TS), Postgres ya está, DX y UI excelentes, despliegue directo en Dokploy. |
| **OpenBao** | **MPL-2.0** (Linux Foundation) | **Namespaces en OSS gratis** (≥ 2.3.x, 2025) | Go, API idéntica a Vault, más "low-level" (sealing, ACL HCL), secretos dinámicos + transit (cifrado-as-a-service) | **Alternativa fuerte**: si se prioriza aislamiento namespace-duro o secretos dinámicos/transit. Más ops. |
| HashiCorp Vault | **BSL 1.1** (IBM) | **Namespaces solo Enterprise ($)** | Go, ecosistema maduro | **Descartado** para self-host SaaS: namespaces de pago y licencia BSL (uso interno permitido, pero OpenBao da lo mismo sin la duda). |

**Patrón multi-tenant** (clave): mapear **1 tenant (Clerk org) → 1 unidad de aislamiento** del gestor:
- **Infisical**: un **project por tenant** (o environment/folder), el backend autentica como
  **machine identity** (Universal Auth) con RBAC que sólo ve su scope.
- **OpenBao**: un **namespace por tenant** (gratis en OSS) — cada namespace es un "mini-Vault" con
  sus policies/tokens. Alternativa OSS sin namespaces: **path-per-tenant** (`secret/data/tenants/<tenantId>/<key>`)
  con **policies templated** que restringen por `tenant_id`.

**Integración con el backend (Hono):**

```
[ reply-engine / context-builder / integrations ]
        │  resolve("${secrets.ANTHROPIC_API_KEY}", tenantId)
        ▼
[ SecretsProvider ]  ── caché en memoria (TTL ~60s, invalida al rotar) ──▶ [ Infisical/OpenBao ]
        │                                                                     (scope = tenant)
        ├─ machine identity (no credenciales de usuario)
        └─ los valores se usan y se descartan; NUNCA se persisten ni se loguean
```

- **Capa de abstracción** `SecretsProvider` (interfaz): `get(tenantId, key)`, `set`, `list` (solo
  metadatos), `delete`. Permite empezar con un stub (env) y cambiar de gestor sin tocar el pipeline.
- **Resolución en runtime**, no en `apply`: al construir el cliente LLM/canal o el contexto, se
  resuelve la referencia, se usa, se descarta. El `apply` solo **valida existencia**.
- **Caché** con TTL corto para no pegarle al gestor en cada mensaje del pipeline; invalidación
  explícita al rotar.
- **Nunca al frontend, nunca a logs, nunca a la DB en claro.**

**Qué guarda nuestra DB:** **ningún valor de secreto**. A lo sumo una tabla ligera de **metadatos /
punteros** para UX y validación del manifiesto:

```
secret_refs(tenant_id, key, provider_path, version, created_at, last_rotated_at)
  -- el VALOR vive solo en el gestor; aquí solo el índice (qué keys existen, a dónde apuntan)
```

**Variables (no sensibles):** bloque `vars:` del manifiesto y/o tabla `config_vars(tenant_id, key,
value)`. Se interpolan en texto plano; **no** pasan por el gestor de secretos.

**Migración de lo que hoy está en claro (§2.2):**
- `channels.credentials` → mover valores al gestor; en la fila dejar **solo referencias**
  (`{ botToken: "secretRef://wa-soporte/botToken" }`).
- Webhook tokens de **alta frecuencia de validación** (se comprueban en cada inbound): matiz de
  diseño — o caché agresivo desde el gestor, o se mantienen en columna por ser *capability tokens*
  de baja sensibilidad (no credenciales de terceros). **Decidir en diseño** (ver Q3).

## 6. Arquitectura de integración (vista de conjunto)

```
   agentpack.yaml ──POST /api/iac/apply──▶ [ Reconciliador ]
   (git, sin secretos)                          │
                                                 ├─ Zod + compileCondition (valida)
                                                 ├─ resuelve key→UUID, ${vars}, valida ${secrets}
                                                 ├─ plan (diff)  ──(dryRun)──▶ respuesta
                                                 └─ apply (tx Drizzle) ──▶ [ Postgres: agents, … ]
                                                                              routing_rules, …

   Runtime (pipeline conversacional E14):
   inbound ─▶ resuelve agent_id ─▶ context-builder ─▶ SecretsProvider.get(tenant, KEY)
                                                              │
                                                              ▼
                                                    [ Infisical / OpenBao ]  (scope por tenant)
```

## 7. Trabajo necesario (gap respecto al código actual)

1. **DB**: columna `key` (+ `unique(tenant_id, key)`) en `agents`, `channels`, `knowledge_collections`,
   `routing_rules`; backfill desde `name` en la migración. Tabla `secret_refs` (+ opcional `config_vars`).
2. **Secretos**: desplegar el gestor (Infisical/OpenBao) en Dokploy; módulo `SecretsProvider` +
   machine identity + caché; migrar `channels.credentials`/tokens; refactor de `integrations/*` y
   `env.ts` para resolver por-tenant donde aplique.
3. **Manifiesto**: esquema Zod del `agentpack.yaml`; parser YAML; cargador de `path` (identidad/KB/schema).
4. **Reconciliador**: `plan()` (diff) + `apply()` (tx) + reporte de handshakes; endpoint `POST /api/iac/apply`.
5. **Idempotencia fina**: hash de identidad/KB para no versionar/reingestar sin cambios.
6. **(Opcional) CLI**: `agentpack apply -f agentpack.yaml` sobre la API, para flujo git-friendly.

## 8. Preguntas abiertas / riesgos

- **Q1 — Gestor**: ¿Infisical (TS/Postgres, DX) u OpenBao (namespaces OSS, transit/dynamic)? Recomendado
  Infisical salvo que se priorice aislamiento namespace-duro o secretos dinámicos.
- **Q2 — Aislamiento**: ¿project/namespace por tenant (aislamiento fuerte, más objetos que administrar)
  o path-per-tenant con policies templated (más simple, aislamiento por ACL)?
- **Q3 — Webhook tokens**: ¿migrar al gestor (latencia por validación) o mantener en columna por ser
  capability tokens de baja sensibilidad? Afecta el pipeline de webhooks.
- **Q4 — `prune`/borrado**: ¿el `apply` borra recursos ausentes del manifiesto o solo crea/actualiza?
  Propuesto: `prune: false` por defecto; borrado explícito y nunca en Fase 1.
- **Q5 — Identidad y append-only**: confirmar la regla "nueva versión solo si cambia el contenido"
  para no inflar `identity_documents` en cada `apply`.
- **Q6 — Canales en el manifiesto**: en Fase 1 solo se referencian. ¿Fase 2 incluye Telegram/Meta por
  `secretRef` (su "conexión" es solo un token) y WhatsApp/Evolution con QR modelado como `pending`?
- **Q7 — Rollback/versionado del manifiesto**: ¿guardamos cada manifiesto aplicado (auditoría/rollback)
  o confiamos en git como fuente de verdad? Encaja con `generations`/auditoría existente.
- **Q8 — Disponibilidad del gestor**: si el gestor cae, el pipeline no resuelve secretos. ¿Caché con
  TTL extendido como degradación, o fallar cerrado? Definir SLO.

## 9. Próximos pasos (descomposición sugerida para una futura épica E15)

> No se crea la épica en esta sesión (decisión D4). Esbozo para cuando se decida:

1. **US — Bóveda de secretos y `SecretsProvider`**: desplegar gestor, abstracción, machine identity,
   caché, `secret_refs`. *(prerrequisito de seguridad; entrega valor solo —cifra lo que hoy está en claro)*
2. **US — Migración de credenciales en claro al gestor**: `channels.credentials` + tokens.
3. **US — Identidad lógica (`key`) en entidades raíz** + backfill.
4. **US — Esquema y validación del `agentpack.yaml`** (Zod + `compileCondition`).
5. **US — Reconciliador `plan`/`apply`** (idempotente, transaccional, handshakes, `dryRun`).
6. **US — (Opcional) CLI `agentpack`** y/o vista de "aplicar manifiesto" en la UI.

Orden recomendado: **1 → 2** (seguridad primero, independiente del YAML) y en paralelo **3 → 4 → 5**
(el manifiesto). La pieza de secretos aporta valor aunque el manifiesto aún no exista.

## 10. Fuentes

- Infisical — Open Source Secrets Management for DevOps (2026): https://infisical.com/blog/open-source-secrets-management-devops
- Infisical — repositorio (licencia MIT, SDK Node, machine identity, Docker Compose): https://github.com/infisical/infisical
- Infisical — Secrets Management overview: https://infisical.com/docs/documentation/platform/secrets-mgmt/overview
- OpenBao — Announcing Namespaces (OSS): https://openbao.org/blog/namespaces-announcement/
- OpenBao — Namespaces (docs): https://openbao.org/docs/concepts/namespaces/
- OpenBao 2.3.0 release notes: https://openbao.org/community/release-notes/2-3-0/
- OpenBao vs HashiCorp Vault — comparación 2026: https://jorijn.com/en/blog/hashicorp-vault-vs-openbao/
- HashiCorp Vault — Namespaces (Enterprise): https://developer.hashicorp.com/vault/docs/enterprise/namespaces
- Vault multi-tenancy strategies (path vs namespace): https://medium.com/hashicorp-engineering/vault-multi-tenancy-strategies-67922f1eb9d
- Tenant Isolation Strategies for Multi-Tenant SaaS (SSOJet): https://ssojet.com/blog/tenant-isolation-strategies-infrastructure-patterns-multi-tenant-saas
