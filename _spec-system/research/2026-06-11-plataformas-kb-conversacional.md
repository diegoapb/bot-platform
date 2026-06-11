---
date: 2026-06-11
title: ¿Apoyarnos en una plataforma KB/RAG existente para E04–E07? Comparativa open-source
author: Claude (agente)
tags: [rag, knowledge-base, memoria, identidad, motor-conversacional, evaluacion, build-vs-buy, E04, E05, E06, E07]
status: draft
---

> **Pregunta que resuelve esta investigación:** ¿conviene apoyarnos en una herramienta open-source que ya gestiona bases de conocimiento / RAG / memoria conversacional para acelerar las épicas E04 (identidad), E05 (conocimiento y catálogo), E06 (motor conversacional) y E07 (memoria por cliente), en vez de construirlo todo a mano?
>
> Criterios prioritarios del proyecto: **API-first**, **code-first (Infraestructura como código)** y **AI-friendly**. Se piden también alternativas modernas.

---

## TL;DR — recomendación

**No adoptar una plataforma monolítica todo-en-uno (Dify, RAGFlow, Onyx, AnythingLLM) como núcleo del producto.** Son excelentes productos, pero son *aplicaciones completas* en Python con su propia UI, su propia base de datos y su propio modelo de tenancy. Integrarlas significa operar **un segundo sistema en paralelo** y consumirlo "API-first como caja negra", lo cual choca con nuestro enfoque code-first (todo el dominio vive en nuestro monorepo TS) y con el aislamiento multi-tenant por bot que ya tenemos resuelto con Clerk + Drizzle + Postgres.

**Sí apoyarnos en librerías code-first embebibles**, que viven *dentro* de `apps/backend` (Hono + Drizzle) y reutilizan nuestro Postgres/pgvector:

| Capacidad | Épica | Apuesta principal | Alternativa |
|---|---|---|---|
| Pipeline RAG + agente + memoria | E05/E06/E07 | **Mastra** (TS-native, sobre Vercel AI SDK) | LlamaIndex.TS |
| Ingestión/chunking/retrieval | E05 | **LlamaIndex.TS** (si queremos ingestión "first-class") | RAG de Mastra |
| Streaming / llamada a LLM | E06 | **Vercel AI SDK** (base de Mastra; ya AI-friendly) | — |
| Memoria por cliente | E07 | **Mem0** (Apache-2.0, simple) o memoria nativa de Mastra | Zep/Graphiti (grafo temporal) |
| Identidad versionada (E04) | E04 | **Construir nosotros** (es CRUD + versionado, no necesita plataforma) | — |

**Caso especial a vigilar: R2R (SciPhi).** Es el único "motor RAG completo" que almacena los vectores en **Postgres + pgvector** y expone todo por **REST API-first**. Si en algún momento el RAG casero se nos queda corto (knowledge graphs, HyDE, reranking, RAPTOR), R2R es el candidato a "subir de nivel" sin abandonar pgvector. Por ahora es Python/FastAPI: sería un servicio aparte, no código en nuestro monorepo.

---

## Contexto: qué necesitamos realmente (mapeo épicas → capacidad)

Nuestro stack actual (de `tech-stack.md`): monorepo **pnpm + TypeScript**, backend **Hono + Drizzle ORM + Postgres (pgvector)**, auth **Clerk** multi-tenant, **Evolution API** (WhatsApp) y **Chatwoot** (inbox), desplegado en **Dokploy**.

| Épica | Qué pide | Qué tipo de herramienta encaja |
|---|---|---|
| **E04 — Identidad** | Documentos `SOUL.md`/`IDENTITY.md`/`GUARDRAILS.md` por bot, editables, **versionados**, que compilan a un system prompt. | Es **CRUD + historial de versiones**. No es un problema de RAG. No necesita plataforma externa. |
| **E05 — Conocimiento + catálogo** | Ingestión (texto, md/txt/pdf, FAQs) → chunking → embeddings → **pgvector scopeado por tenant/bot** → `retrieve(query, botId)`. + CRUD de catálogo. | Aquí es donde un **framework/motor RAG** aporta valor real. |
| **E06 — Motor conversacional** | webhook → construir contexto (E04+E05+E07) → LLM → respuesta → Chatwoot/Evolution. Estados `bot/human/paused`, handoff, idempotencia. | **Framework de agentes/orquestación** + streaming. La integración con Evolution/Chatwoot la ponemos nosotros. |
| **E07 — Memoria por cliente** | Perfil por contacto (teléfono como clave), hechos clave-valor, **rolling summary**, inyección en contexto, aislado por tenant/bot. | **Capa de memoria** (Mem0/Zep) o la memoria nativa del framework de agentes. |

**Restricción transversal clave:** aislamiento multi-tenant (`retrieve()` solo devuelve chunks del bot consultado; memorias por tenant/bot). Esto ya lo garantizamos a nivel de fila en Postgres. Una plataforma externa nos obligaría a **re-implementar la tenancy en su modelo** (workspaces/datasets), duplicando una decisión ya tomada.

---

## Criterios de evaluación

1. **API-first** — ¿se consume por API REST limpia?
2. **Code-first / IaC** — ¿la configuración vive como código en nuestro repo y se versiona, o requiere clicar en una UI/estado mutable?
3. **AI-friendly** — ¿está pensado para LLMs (model-agnostic, tools, streaming, evals)?
4. **Encaje con stack** — ¿es TypeScript embebible, o un servicio Python aparte? ¿reutiliza pgvector?
5. **Tenancy** — ¿el aislamiento por tenant/bot es natural o hay que forzarlo?
6. **Coste operativo** — ¿una librería en nuestro proceso, o N contenedores extra que mantener en Dokploy?

---

## Bloque A — Plataformas "todo en uno" (monolíticas)

Son productos completos: ingieren, indexan, chatean y traen UI. Se integran "como servicio" vía su API.

### Dify
- **Web / repo:** https://dify.ai · https://github.com/langgenius/dify
- **Qué hace:** plataforma para construir apps LLM: workflow visual (low-code), RAG, agentes, gestión de modelos, observabilidad. Cada app publicada expone REST + SSE.
- **Tech stack:** backend **Python (Flask)** + Worker, frontend **Next.js/TypeScript**, **PostgreSQL** (metadatos), **Weaviate** (vectores), **Redis** (colas), **MinIO** (ficheros), plugin daemon + sandbox de código, Nginx.
- **Licencia:** "Dify Open Source License" (Apache-2.0 con condiciones extra; restringe revender como multi-tenant SaaS).
- **API-first:** ✅ fuerte. **Code-first:** ⚠️ el flujo se diseña en su UI; el "código" es su estado, no el nuestro. **AI-friendly:** ✅ (cientos de modelos, Ollama, agentes).
- **Encaje:** sería un sistema paralelo grande (≈6-8 contenedores). Su tenancy son "apps/datasets", no nuestros bots. La cláusula multi-tenant del license es un riesgo para nuestro producto SaaS.

### RAGFlow
- **Web / repo:** https://ragflow.io · https://github.com/infiniflow/ragflow
- **Qué hace:** motor RAG con **comprensión profunda de documentos** (layout, tablas, OCR), RAPTOR, agentes, API compatible con OpenAI.
- **Tech stack:** **Python**, **Elasticsearch** (índice vectorial + full-text híbrido), **MySQL**, **Redis**, **MinIO**.
- **Licencia:** **Apache-2.0**.
- **API-first:** ✅ (incl. SDK Python + API OpenAI-compatible). **Code-first:** ⚠️ configuración por UI. **AI-friendly:** ✅.
- **Encaje:** la mejor calidad de ingestión de PDFs complejos del lote, pero trae **Elasticsearch + MySQL** — pila pesada y **no reutiliza nuestro Postgres/pgvector**. Mucho que operar para E05.

### Onyx (ex-Danswer)
- **Web / repo:** https://onyx.app · https://github.com/onyx-dot-app/onyx
- **Qué hace:** asistente AI + búsqueda empresarial conectada a docs/apps (Slack, GitHub, Confluence…). Chat + RAG + agentes + acciones.
- **Tech stack:** **Python (FastAPI)** + frontend, índice vectorial + keyword, workers de sync, servidores de inferencia, **Redis**, **MinIO**.
- **Licencia:** **MIT** (core CE); Enterprise Edition con extras.
- **API-first:** ✅. **Code-first:** ⚠️. **AI-friendly:** ✅.
- **Encaje:** orientado a "enterprise search interno" (conectores a fuentes corporativas), no a "bot de servicio por tenant sobre WhatsApp". Modelo mental distinto al nuestro.

### AnythingLLM
- **Web / repo:** https://anythingllm.com · https://github.com/Mintplex-Labs/anything-llm
- **Qué hace:** app RAG todo-en-uno con **workspaces** aislados, agentes, chunking, vector store; desktop o Docker. **Soporta MCP** (expone workspaces como tools).
- **Tech stack:** **Node.js/JavaScript** (¡el único JS del bloque!), **LanceDB** por defecto (configurable a otros), REST API con Bearer token.
- **Licencia:** **MIT**.
- **API-first:** ✅. **Code-first:** ⚠️ (workspaces se gestionan por UI/API, no como código). **AI-friendly:** ✅ (+MCP).
- **Encaje:** el más ligero y el más cercano en lenguaje (JS). Sus "workspaces" podrían mapear 1:1 a bots. Aun así sigue siendo una app externa con su propia DB; lo usaríamos como caja negra vía API. Buena opción si quisiéramos un **MVP rapidísimo** de KB sin escribir el pipeline.

### R2R (SciPhi) — *el más alineado del bloque*
- **Web / repo:** https://r2r-docs.sciphi.ai · https://github.com/SciPhi-AI/R2R
- **Qué hace:** "motor de recuperación agéntico" de grado producción: ingestión multimodal, búsqueda híbrida + reranking, **knowledge graphs automáticos**, técnicas RAG avanzadas (HyDE), gestión documental — todo por **REST API**.
- **Tech stack:** **Python (FastAPI)**, **PostgreSQL + pgvector** para los embeddings.
- **Licencia:** **MIT**.
- **API-first:** ✅✅ (diseñado API-first de raíz). **Code-first:** 🟡 (config + API; desplegable por compose). **AI-friendly:** ✅✅.
- **Encaje:** **reutiliza pgvector**, que es exactamente nuestro almacén. Es la opción "platform" que menos fricción tendría: un servicio Python aparte en Dokploy que apunta a (otra DB) Postgres, consumido por nuestro Hono. **Candidato a futuro** si el RAG casero se queda corto.

---

## Bloque B — Frameworks code-first (embebibles en nuestro backend) — *recomendado*

No son aplicaciones: son **librerías** que importamos en `apps/backend`. La configuración es **código TypeScript versionado** (≡ IaC para la capa AI), reutilizan **nuestro** Postgres/pgvector y respetan **nuestra** tenancy.

### Mastra — *apuesta principal*
- **Web / repo:** https://mastra.ai · https://github.com/mastra-ai/mastra
- **Qué es:** framework **TypeScript-native** (de los creadores de Gatsby) para agentes, workflows y RAG. Construido **sobre Vercel AI SDK**. 1.0 en enero 2026, ~22k★.
- **Cubre de un golpe E05+E06+E07:**
  - **RAG:** pipeline completo (chunking, embeddings, vector store, similarity search, reranking) con soporte **pgvector** entre muchos otros.
  - **Agents/Workflows:** agentes con tools, control de parada — encaja con el pipeline y el handoff de E06.
  - **Memory (E07):** historial, *semantic recall*, *working memory* (hechos/preferencias estructurados) y *observational memory* (compresión de conversaciones ≈ rolling summary). Storage intercambiable: **LibSQL en dev, PostgreSQL en prod, mismo código**.
  - **Evals:** evaluación model-graded/rule-based (relevancia, fidelidad, toxicidad…) — útil para los criterios de calidad de E06.
  - **Model routing:** 90+ proveedores tras una interfaz estándar.
- **API-first / Code-first / AI-friendly:** ✅ / ✅✅ (todo es código TS en el repo) / ✅✅.
- **Encaje:** máximo. Es la opción que más "casa" con que el dominio viva en el monorepo y con reutilizar pgvector. Verificar matices de licencia por paquete antes de comprometer (open source; confirmar términos exactos en el repo).

### LlamaIndex.TS
- **Web / repo:** https://ts.llamaindex.ai · https://github.com/run-llama/LlamaIndexTS
- **Qué es:** framework de datos para LLM, **RAG-first**: trata ingestión, chunking, indexado y query engines como ciudadanos de primera clase. Loaders (FS, web, PDF, Notion, GitHub, Confluence, S3), embeddings (OpenAI, Cohere, HF, Voyage, Mistral), vector stores (**pgvector**, Pinecone, Qdrant, Weaviate, Chroma…), query engines híbridos.
- **API-first / Code-first / AI-friendly:** ✅ / ✅✅ / ✅✅.
- **Encaje:** ideal si para **E05** queremos la ingestión más rica "de fábrica" (varios formatos, estrategias de chunking) sin escribirla a mano. Combina bien con Vercel AI SDK para el streaming. Se puede usar **solo para retrieval** y dejar la orquestación a Mastra/AI SDK.

### Vercel AI SDK
- **Web:** https://ai-sdk.dev (alias https://sdk.vercel.ai)
- **Qué es:** SDK TS para construir features LLM (llamadas a modelos, **streaming**, tool calling, UIs). Es la **base sobre la que corre Mastra**, así que ya estaría en nuestras dependencias.
- **Encaje:** la capa mínima para E06 (hablar con el LLM y hacer streaming). No hace RAG por sí solo; se combina con LlamaIndex.TS/Mastra para retrieval.

> Patrón recomendado: **LlamaIndex.TS para retrieval + Vercel AI SDK para streaming**, o directamente **Mastra** que envuelve ambos mundos.

---

## Bloque C — Capa de memoria (E07)

Si no usamos la memoria nativa de Mastra, estas son las especialistas:

### Mem0
- **Web / repo:** https://mem0.ai · https://github.com/mem0ai/mem0
- **Qué es:** capa de memoria para apps AI: combina embeddings vectoriales con extracción de hechos por LLM y recuperación semántica. **SDKs Python y TypeScript.**
- **Licencia:** **Apache-2.0** (núcleo OSS; *Graph Memory* avanzado, retrieval ilimitado y analytics quedan en el cloud de pago). El OSS da memoria vector + clave-valor — justo lo que pide E07.
- **Encaje:** simple, TS disponible, autoalojable. **Recomendado para E07** si queremos una pieza dedicada.

### Zep / Graphiti
- **Web / repo:** https://getzep.com · https://github.com/getzep/graphiti
- **Qué es:** memoria basada en **grafo de conocimiento temporal** (Graphiti, open source): cada hecho tiene ventana de validez (cuándo fue verdad / cuándo se superó). Ensambla "context blocks" eficientes en tokens. Mejor en benchmarks de memoria larga (LongMemEval 63.8% vs 49.0% de Mem0 con GPT-4o, según comparativas públicas).
- **Encaje:** más potente y más complejo. **Overkill para el MVP**, pero el candidato si la memoria temporal/relacional se vuelve diferenciador.

### Letta (ex-MemGPT)
- **Web / repo:** https://letta.com · https://github.com/letta-ai/letta
- **Qué es:** plataforma de **agentes con estado** y memoria por niveles (core/recall/archival). **Postgres + pgvector**, REST API, SDKs Python y TS, Apache-2.0.
- **Encaje:** es más "framework de agente completo" que "capa de memoria embebible"; se ejecuta como **servidor aparte** (puerto 8283). Solaparía con E06. Útil como referencia de arquitectura de memoria más que como dependencia directa.

---

## Comparativa resumida

| Herramienta | Tipo | Lenguaje / stack | Vector store | API-first | Code-first (IaC) | AI-friendly | Reusa **nuestro** pgvector | Licencia |
|---|---|---|---|:--:|:--:|:--:|:--:|---|
| **Mastra** | Librería TS | TypeScript (sobre AI SDK) | pgvector + muchos | ✅ | ✅✅ | ✅✅ | ✅ | OSS (verificar) |
| **LlamaIndex.TS** | Librería TS | TypeScript | pgvector + muchos | ✅ | ✅✅ | ✅✅ | ✅ | MIT |
| **Vercel AI SDK** | Librería TS | TypeScript | n/a (no RAG) | ✅ | ✅✅ | ✅✅ | — | OSS |
| **Mem0** | Memoria | Python + **TS SDK** | configurable | ✅ | ✅ | ✅ | parcial | Apache-2.0 |
| **Zep/Graphiti** | Memoria (grafo) | Python | grafo + vector | ✅ | 🟡 | ✅ | ✗ | OSS |
| **R2R** | Plataforma RAG | Python (FastAPI) | **Postgres+pgvector** | ✅✅ | 🟡 | ✅✅ | 🟡 (otra DB) | MIT |
| **AnythingLLM** | App todo-en-uno | **Node.js** | LanceDB (config.) | ✅ | ⚠️ | ✅ | ✗ | MIT |
| **Dify** | App todo-en-uno | Python + Next.js | Weaviate | ✅ | ⚠️ | ✅ | ✗ | Dify OSS (Apache+) |
| **RAGFlow** | Motor RAG | Python | Elasticsearch | ✅ | ⚠️ | ✅ | ✗ | Apache-2.0 |
| **Onyx** | App todo-en-uno | Python (FastAPI) | vector+keyword | ✅ | ⚠️ | ✅ | ✗ | MIT (core) |
| **Letta** | Agente+memoria | Python | **pgvector** | ✅ | 🟡 | ✅✅ | 🟡 (otra DB) | Apache-2.0 |

Leyenda: ✅✅ excelente · ✅ bueno · 🟡 parcial · ⚠️ contra nuestro enfoque · ✗ no.

---

## Recomendación por épica

- **E04 — Identidad:** **construir nosotros.** Es CRUD + versionado (Drizzle + tabla de versiones) que compila a system prompt. Ninguna plataforma KB ayuda aquí; meter una añadiría acoplamiento sin beneficio.
- **E05 — Conocimiento + catálogo:** **embeber un framework TS sobre nuestro pgvector.** `retrieve(query, botId)` con **Mastra RAG** o **LlamaIndex.TS**. El catálogo es CRUD nuestro (Drizzle), opcionalmente con búsqueda semántica reutilizando el mismo índice.
- **E06 — Motor conversacional:** **Vercel AI SDK** (ya viene con Mastra) para LLM + streaming; orquestación de contexto/handoff/idempotencia **la escribimos nosotros** (es lógica de negocio + integración Evolution/Chatwoot, no algo que delegar).
- **E07 — Memoria por cliente:** empezar con **memoria nativa de Mastra** (working memory + observational summary cubren hechos + rolling summary). Si queremos una pieza dedicada y desacoplada: **Mem0 (Apache-2.0, TS)**. Reservar **Zep/Graphiti** para cuando la memoria temporal sea diferenciador.

**Camino sugerido:** adoptar **Mastra** como columna vertebral AI del backend (cubre E05+E06+E07 con un solo modelo mental TS-native y reutiliza pgvector), y **mantener R2R en el radar** como motor RAG "de subida de nivel" vía API si la ingestión/recuperación casera se queda corta.

---

## Riesgos y notas

- **Lock-in de framework:** Mastra es joven (1.0 en 2026). Mitigación: corre sobre Vercel AI SDK (estándar de facto) y el retrieval es reemplazable por LlamaIndex.TS; el dato vive en *nuestro* Postgres, no en el framework.
- **Licencias a confirmar antes de comprometer:** verificar términos exactos de Mastra por paquete y la cláusula multi-tenant de **Dify** (relevante porque nuestro producto ES un SaaS multi-tenant).
- **Tentación de "comprar" en vez de "construir":** AnythingLLM/Dify dan un MVP de KB en horas, pero a costa de un sistema externo cuya tenancy y datos no controlamos al nivel que exige E05 ("aislamiento por tenant verificado"). El ahorro inicial se paga en integración y operación.
- **Operación (Dokploy):** cada plataforma del Bloque A son varios contenedores extra (ES/MySQL/Weaviate/MinIO/Redis…). Las librerías del Bloque B no añaden infraestructura: corren en `apps/backend`.

---

## Fuentes

- RAGFlow — https://github.com/infiniflow/ragflow · https://ragflow.io/docs/
- Dify — https://dify.ai · https://github.com/langgenius/dify
- Onyx (ex-Danswer) — https://onyx.app · https://github.com/onyx-dot-app/onyx · https://docs.onyx.app/welcome
- R2R (SciPhi) — https://github.com/SciPhi-AI/R2R
- AnythingLLM — https://anythingllm.com · https://github.com/Mintplex-Labs/anything-llm
- Mastra — https://mastra.ai · https://github.com/mastra-ai/mastra · https://mastra.ai/reference/storage/postgresql
- LlamaIndex.TS — https://ts.llamaindex.ai · https://github.com/run-llama/LlamaIndexTS
- Vercel AI SDK — https://ai-sdk.dev
- Mem0 — https://mem0.ai · https://github.com/mem0ai/mem0
- Zep / Graphiti — https://getzep.com · https://github.com/getzep/graphiti
- Letta (ex-MemGPT) — https://letta.com · https://github.com/letta-ai/letta · https://docs.letta.com
