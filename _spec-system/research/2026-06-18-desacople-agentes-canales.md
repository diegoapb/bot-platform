---
fecha: 2026-06-18
autor: @diego
tipo: especificación / entendimiento previo a épica
estado: borrador
relacionado: E04 (identidad-agente), E05 (conocimiento-y-catálogo), E07 (memoria-por-cliente), E11 (canales-multicanal-chatwoot), E13 (propuesta), E14 (propuesta)
---

# Desacople de agentes y canales

> Documento de entendimiento. Captura la visión, el estado actual, las decisiones tomadas
> en el cuestionario de profundización del 2026-06-18 y el modelo objetivo. Sirve de base
> para redactar las épicas E13 (desacople) y E14 (ruteo multi-agente).

## 1. Visión

Hoy la plataforma asume que **un bot = un agente = un canal = un conjunto de conocimiento**. Todo
está fusionado en la entidad `bots`. Queremos romper esa fusión para habilitar configuraciones más
ricas:

- Un mismo **agente** atendiendo **varios canales** (WhatsApp + Instagram + Telegram → un agente).
- **Distintos agentes** para distintos grupos de canales (2 canales → agente A, otros 2 → agente B).
- **Conocimiento independiente** por agente, pero **compartible/heredable** entre agentes mediante una
  biblioteca de conocimiento reutilizable.
- (Fase 2) **Varios agentes sobre un mismo canal**, eligiendo cuál atiende a cada cliente según reglas
  que dependen del cliente y su etapa de relación (pre-venta, post-venta, garantías, etc.).

### Escenario guía (post/pre venta)

> Juan está en **post-compra** → lo atiende un agente especializado en **garantías** con conocimiento de
> su compra. Felipe es **cliente nuevo** sin comprar → lo atiende un agente de **información de productos
> y precios**. Ambos escriben por **el mismo canal**, pero los atienden agentes distintos.

Este escenario es el corazón de la **Fase 2 (ruteo multi-agente)**.

## 2. Modelo conceptual objetivo

Separamos tres conceptos que hoy viven fusionados:

| Concepto | Qué es | Hoy | Objetivo |
|---|---|---|---|
| **Agente** | El "cerebro": identidad/prompt + modelo + conocimiento enlazado | = `bots` | Entidad propia |
| **Canal** | El transporte (WhatsApp, Instagram, Telegram, Messenger…) | `channels.botId` (N:1 a bot) | N:M con agente |
| **Conocimiento** | Colecciones de saber indexado (embeddings) | `knowledgeSources/Chunks.botId` | Biblioteca reutilizable, enlazable por agentes |

Relaciones objetivo:

- **Canal ↔ Agente: N:M** (un agente atiende varios canales; en Fase 2, un canal puede tener varios agentes).
- **Agente ↔ Colección de conocimiento: N:M** (un agente usa sus colecciones propias + las que enlaza).
- **Identidad/prompt y modelo: siempre propios del agente** (no se comparten ni heredan en esta iteración).
- **Cliente (contacto)**: se unifica entre canales del mismo agente cuando comparten identificador (tel/email).

## 3. Estado actual (código)

Stack: Drizzle ORM + PostgreSQL (pgvector) · Hono · Clerk (multitenancy por Organizations) · Evolution
API (WhatsApp legacy) · Chatwoot (canónico de mensajes + handoff humano) · Claude (LLM) + OpenAI (embeddings).

Todo cuelga del `bot`:

- `bots` — ES el agente Y el dueño del canal legacy WhatsApp/Evolution (`evolutionInstance`, `chatwootInboxId`).
  El modelo LLM es **global** (`env.LLM_MODEL`), no por bot. La identidad (system prompt) vive en
  `identityDocuments` versionado por tipo (SOUL/IDENTITY/GUARDRAILS), por bot.
- `channels` — canales nativos (telegram, whatsapp_cloud, instagram, messenger) con `botId` (**N:1**, único por `botId+type`).
- `knowledgeSources` / `knowledgeChunks` — conocimiento **por bot** (`botId`), aislado. Embeddings vector[1536], índice HNSW.
- `channelLinks` — abstracción de contacto: `botId` + `channelId` (nullable) + identificador (`waJid`/`phoneE164`) + mapeo Chatwoot.
- `conversations` — cuelgan de `channelLink` → bot; `mode` (bot/human/paused). Memoria en `contactMemories`/`contactFacts`/`extractedData`, anclada a `channelLink` (por bot).
- **Ruteo**: directo y hardcodeado. Webhook → instancia (Evolution) o `inboxId` (Chatwoot account) → **un** bot. **No hay motor de reglas.**

Implicación: cada canal ya conoce a su bot por FK directa. El desacople consiste en insertar la entidad
**Agente** entre canal y conocimiento, y convertir las FKs directas en relaciones N:M.

## 4. Decisiones tomadas (cuestionario 2026-06-18)

| # | Decisión | Elección |
|---|---|---|
| 1 | ¿Qué decide qué agente atiende a un cliente (canal multi-agente)? | **Híbrido**: reglas deterministas + *fallback* a agente orquestador. *(Fase 2)* |
| 2 | Semántica de compartir conocimiento | **Biblioteca de conocimiento reutilizable** (colecciones como entidad propia, enlazables). |
| 3 | Traspaso de agente a mitad de conversación | **No cambia en caliente**: el agente se fija al inicio de la conversación; el cambio aplica al siguiente contacto/conversación. |
| 4 | Alcance de esta iteración | **Por fases**: Fase 1 = desacople N:M canal↔agente + conocimiento compartible. Fase 2 = ruteo multi-agente por reglas. |
| 5 | Migración de bots existentes | **Automática**: cada bot → 1 agente + sus canales/conocimiento/config ya enlazados. Sin trabajo manual. |
| 6 | Qué es propio vs. compartible | **Prompt y modelo siempre propios**; solo el **conocimiento** se hereda/enlaza. *(Modelo LLM: ver pregunta abierta Q3.)* |
| 7 | Identidad del cliente entre canales | **Unificar si comparten identificador** (teléfono/email) → memoria compartida entre canales del mismo agente. |

## 5. Modelo de datos objetivo (propuesta)

> Propuesta de alto nivel para guiar el diseño técnico de las historias; los nombres/campos finales
> se afinan en `design.md` de cada historia.

### Nuevas entidades

- **`agents`** — la entidad agente propia.
  `id`, `tenantId`, `name`, `status` (draft/active/paused), `model` (nullable → global si null, ver Q3),
  `extractionSchema`, `handoffMessage`, `whitelistEnabled`, timestamps.
  *Reapunta lo que hoy es config "de cerebro" en `bots`.*
- **`knowledgeCollections`** — colección reutilizable de conocimiento.
  `id`, `tenantId`, `name`, `description`, timestamps. (El conocimiento deja de colgar del agente.)
- **`agentKnowledgeLinks`** — N:M agente ↔ colección. `agentId`, `collectionId`, (opcional) `priority`.
- **`agentChannels`** — N:M agente ↔ canal. `agentId`, `channelId`, timestamps.
  *(En Fase 1, un canal se enlaza a un solo agente; la tabla N:M ya deja lista la Fase 2.)*

### Entidades modificadas

- **`channels`** — se le quita la dependencia dura `botId`; el vínculo con el agente pasa por `agentChannels`.
  El canal legacy WhatsApp/Evolution se modela también como canal "real" para uniformar (o se mantiene su
  representación virtual; decidir en diseño).
- **`knowledgeSources` / `knowledgeChunks`** — cuelgan de `collectionId` en vez de `botId`.
- **`identityDocuments`** — pasan a referenciar `agentId`.
- **`channelLinks` / `conversations` / memoria** — referencian `agentId` en vez de `botId`. La conversación
  **graba el `agentId` resuelto** al inicio (consecuencia de la decisión #3: el agente se fija y no cambia en caliente).
- **`contact` (nuevo o derivado)** — para unificar identidad entre canales (decisión #7): un contacto del
  agente identificado por tel/email, con sus `channelLinks` colgando de él. La memoria/facts pasan a anclarse
  al contacto unificado, no al `channelLink`.

### Migración (decisión #5)

Script idempotente: por cada `bot` → crear `agent` (copiando prompt/modelo/config), crear una
`knowledgeCollection` con su conocimiento actual y enlazarla, reapuntar sus `channels` vía `agentChannels`,
y migrar `channelLinks`/conversaciones/memoria a `agentId`. Sin downtime de datos.

## 6. Fases / épicas propuestas

### Épica E13 — Desacople agente ↔ canal y biblioteca de conocimiento (Fase 1)

**Objetivo**: introducir la entidad Agente, relación N:M canal↔agente, conocimiento como biblioteca
reutilizable enlazable, e identidad de cliente unificada entre canales. Sin multi-agente por canal todavía.

**Dentro**:
- Entidad `agents` + migración automática `bot → agente` (decisión #5).
- N:M canal↔agente (`agentChannels`); un agente puede atender varios canales.
- Biblioteca de conocimiento: `knowledgeCollections` + enlace N:M a agentes; conocimiento deja de colgar del bot (decisión #2).
- Identidad/prompt y modelo propios por agente (decisión #6).
- Unificación de contacto por identificador (tel/email) y memoria compartida entre canales del agente (decisión #7).
- UI: gestión de agentes, asignación de canales a un agente, gestión y enlace de colecciones de conocimiento.

**Fuera (→ E14)**:
- Varios agentes sobre un mismo canal.
- Motor de reglas / agente orquestador.
- Cambio de agente en caliente (explícitamente descartado por decisión #3).

### Épica E14 — Ruteo multi-agente por reglas dentro de un canal (Fase 2)

**Objetivo**: que un canal pueda tener varios agentes y que cada cliente sea atendido por el agente
correcto según su etapa/contexto, vía reglas deterministas con *fallback* a un orquestador (decisión #1).

**Dentro**:
- Múltiples agentes por canal sobre la N:M ya existente.
- Motor de reglas declarativas evaluando datos del contacto (etapa, tags, si compró, facts extraídos) → agente.
- Agente orquestador (router LLM) como *fallback* cuando ninguna regla aplica.
- Modelo de "etapa/segmento" del cliente (cómo se setea: manual, CRM, o derivado de facts) — definir en diseño.
- Resolución del agente **al inicio de la conversación** y persistido en ella (decisión #3).

**Fuera**:
- Cambio de agente a mitad de conversación.

## 7. Preguntas abiertas / riesgos

- **Q1 — Canal legacy Evolution**: ¿lo normalizamos como fila en `channels` o mantenemos su representación
  virtual sobre columnas de `bots`/`agents`? Afecta cuánto se simplifica el ruteo.
- **Q2 — Granularidad del conocimiento enlazado**: ¿se enlaza la colección entera o también fuentes sueltas?
  (Decidido: colección como unidad; confirmar que no hace falta enlace a nivel de fuente.)
- **Q3 — Modelo LLM por agente**: hoy es global. La decisión #6 dice "modelo propio", pero la 3ª opción dejaba
  el modelo global por ahora. Confirmar si E13 ya hace el modelo configurable por agente o se difiere.
- **Q4 — Unificación de contacto y privacidad**: unir por tel/email cruza canales; validar implicaciones
  (un mismo tel en Instagram vs WhatsApp, colisiones, consentimiento) antes de fusionar memorias.
- **Q5 — Aislamiento por tenant del conocimiento**: las colecciones se comparten **solo dentro del mismo
  tenant** (asumido). Confirmar que no hay caso cross-tenant.
- **Q6 — Etapa del cliente (E14)**: ¿de dónde sale la "etapa" (post-venta, pre-venta)? ¿campo manual, label
  de Chatwoot, fact extraído por el pipeline E12, o integración CRM externa? Define el motor de reglas.
- **Q7 — Impacto en pipeline existente**: `reply-engine`, `context-builder`, `knowledge.retrieve()` y
  `message-sync`/`channel-inbound` asumen `botId`. Hay que reemplazar por `agentId`/colecciones sin romper
  conversaciones en vuelo.

## 8. Próximos pasos

1. Validar las preguntas abiertas (sección 7), en especial Q3 (modelo por agente) y Q6 (etapa del cliente).
2. Redactar la épica **E13** con sus historias (entidad agente + migración, N:M canal↔agente, biblioteca de
   conocimiento, unificación de contacto, UI).
3. Redactar la épica **E14** (multi-agente por canal + motor de reglas + orquestador) una vez cerrada E13.
