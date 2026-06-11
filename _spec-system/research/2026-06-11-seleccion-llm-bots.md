---
date: 2026-06-11
title: Selección de LLM para el motor conversacional — pruebas baratas, presentación con Opus
author: Claude (agente)
epic: E06
tags: [llm, pricing, anthropic, haiku, opus, gemini, deepseek, prompt-caching, mastra, evaluacion, E05, E06, E07]
status: draft
---

> **Pregunta que resuelve esta investigación:** ¿qué modelo de lenguaje usar para gestionar los bots del MVP, buscando muy buena calidad a precio muy económico para la fase de pruebas, sabiendo que la presentación/demo usará **Claude Opus** de Anthropic?
>
> Precios verificados el **2026-06-11** contra la documentación oficial de Anthropic y comparativas de mercado. Los precios de LLM cambian con frecuencia: revalidar antes de pasar a producción.

---

## TL;DR — recomendación

**Estrategia de dos modelos de la misma familia:**

| Fase | Modelo | Precio (in/out por MTok) | Por qué |
|---|---|---|---|
| Desarrollo y pruebas | **Claude Haiku 4.5** | $1 / $5 | Mejor relación calidad/precio en tool calling confiable; misma familia que el modelo de demo |
| Presentación / demo | **Claude Opus 4.8** | $5 / $25 | Máxima calidad; los prompts afinados en Haiku se transfieren casi 1:1 |
| (Opcional) pruebas de carga masivas | Gemini Flash-Lite | $0.10 / $0.40 | Solo si el volumen domina sobre la fidelidad de comportamiento |

Con **prompt caching** (−90% en input cacheado), un turno típico del bot cuesta con Haiku **~$0.002–0.004** y con Opus **~$0.015–0.02**. Todo el ciclo de pruebas del MVP cabe en **decenas de dólares**.

La clave no es elegir el modelo más barato en absoluto, sino minimizar el **costo total de afinado**: cambiar de proveedor entre pruebas y demo obliga a re-ajustar prompts, formato de tool calls y guardrails dos veces.

---

## Contexto: qué le pedimos al modelo

El motor (E06/E06-M) no es un chat genérico. En cada turno el modelo debe:

1. **Respetar la identidad** del bot (E04): tono, límites, idioma — principalmente **español**.
2. **Usar tools con criterio**: retrieval de conocimiento (E05), `searchCatalog` (precios/disponibilidad exactos, no inventados) y `requestHandoff` cuando no sabe o el cliente pide humano.
3. **Actualizar working memory** (E07) con datos del cliente sin corromper el schema.
4. Responder en **<15s** (criterio de salida de E06), en mensajes cortos estilo WhatsApp.

Esto convierte la **confiabilidad de tool calling** y la **adherencia a instrucciones** en los criterios dominantes — por encima de benchmarks de razonamiento puro. Es exactamente donde los modelos ultra-baratos suelen fallar: inventan disponibilidad de productos, ignoran el handoff o rompen el JSON de la tool.

## Candidatos evaluados (precios jun 2026)

| Modelo | Input/Output por MTok | Contexto | Fortalezas | Riesgos para nuestro caso |
|---|---|---|---|---|
| **Claude Haiku 4.5** | $1 / $5 | 200K | Tool calling muy predecible; caching −90%; misma familia que Opus | No es el más barato absoluto |
| **Claude Sonnet 4.6** | $3 / $15 | 1M | Escalón intermedio si Haiku se queda corto | 3× el precio de Haiku |
| **Claude Opus 4.8** | $5 / $25 | 1M | Máxima calidad (demo) | Caro para iterar a diario |
| Gemini 2.5 Flash | $0.15 / $0.60 | 1M | Velocidad líder (>200 tok/s), contexto 1M | Prompts no transferibles a Opus; segundo proveedor que integrar |
| Gemini Flash-Lite | $0.10 / $0.40 | 1M | El más barato propietario | Calidad de adherencia menor; mismo problema de transferencia |
| GPT-4.1 mini / nano | $0.40 / $1.60 · $0.10 / $0.40 | 1M | Buen precio-calidad medio | Tercer proveedor; sin ventaja clara sobre los anteriores |
| DeepSeek V3 | ~$0.27 / $1.10 | 128K | Precio open-weight | Tool calling menos confiable; latencia variable; consideraciones de residencia de datos para clientes empresariales |

### Por qué Haiku 4.5 gana para pruebas

1. **Transferencia de afinado**: prompts de identidad, comportamiento de tools y guardrails afinados en Haiku se comportan de forma muy similar en Opus (mismo entrenamiento de tool use, mismo formato). Afinar en Gemini y presentar en Opus = pagar el afinado dos veces.
2. **Un solo proveedor**: una API key (BYOK en Mastra), un solo SDK, una sola superficie de errores/rate limits.
3. **Prompt caching es ideal para nuestro patrón**: identidad del bot + definiciones de tools + working memory se repiten en cada turno → la mayor parte del input se cachea al 10% del precio (la escritura de caché cuesta 1.25× una sola vez por ventana de 5 min).
4. **Calidad suficiente verificable**: en evaluaciones de producción Haiku destaca precisamente en lo que necesitamos — salidas estructuradas y tool calling predecible.

## Estimación de costos

Turno típico estimado: ~3K tokens de input (identidad ~800 + tools ~600 + memoria ~300 + historial ~800 + mensaje y resultados de tools ~500) y ~200 de output. De ese input, ~1.5–2K es cacheable.

| Escenario | Haiku 4.5 | Opus 4.8 |
|---|---|---|
| Turno sin caché | ~$0.004 | ~$0.020 |
| Turno con caché caliente | ~$0.002 | ~$0.011 |
| Conversación (8 turnos) | ~$0.02–0.03 | ~$0.10–0.16 |
| 1.000 conversaciones de prueba | **~$20–30** | — |
| Demo: 50 conversaciones con Opus | — | **~$5–8** |

Conclusión: el presupuesto de LLM **no es un factor limitante del MVP** si se usa Haiku + caching para iterar. El gasto real estará en los embeddings de ingestión (centavos) y en la infraestructura ya presupuestada.

## Integración con la arquitectura (sin cambios)

- El diseño actual (US-011 y US-011-M) ya resuelve el modelo **por bot** vía `RuntimeContext`: `model: ({ runtimeContext }) => runtimeContext.get("bot").model`. Pasar de pruebas a demo es cambiar `anthropic/claude-haiku-4-5` → `anthropic/claude-opus-4-8` en la config del bot. Cero código.
- **BYOK**: la key de Anthropic va directa al proveedor (sin recargo del 5.5% del Memory Gateway de Mastra — ver `alt-mastra/README.md`).
- Activar prompt caching marcando como cacheables los bloques estables del prompt (identidad + tools); el historial y la memoria van fuera del bloque cacheado.

## Plan de validación antes de la demo

1. Construir un set de ~20 conversaciones de referencia (preguntas con respuesta en KB, preguntas de catálogo, peticiones de humano, preguntas sin cobertura).
2. Correrlas con Haiku durante el desarrollo usando los **scorers de evals de Mastra** (faithfulness, hallucination, tool-call accuracy).
3. Una semana antes de la presentación, correr el mismo set con Opus y comparar: la diferencia esperable es de matiz/redacción, no de comportamiento de tools. Si aparece divergencia de comportamiento, ajustar y re-correr (el costo del set completo con Opus es <$1).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Precios cambian (este mercado se mueve mensualmente) | Revalidar precios antes de producción; el routing por config permite cambiar sin código |
| Haiku insuficiente en casos complejos del dominio | Escalón intermedio: Sonnet 4.6 ($3/$15) sin salir de la familia |
| Rate limits del tier inicial de Anthropic en pruebas de carga | Los tiers suben con gasto acumulado; para load-testing puro usar Gemini Flash-Lite (no afecta el afinado porque no se evalúa calidad ahí) |
| Costo de demo se dispara por contexto largo | TokenLimiter + `lastMessages` bajo (ya previsto en US-011-M/US-013-M) |

## Decisión propuesta

- **Adoptar Claude Haiku 4.5 como modelo por defecto de los bots en desarrollo/pruebas.**
- **Claude Opus 4.8 como modelo de presentación**, activado por configuración del bot.
- Activar **prompt caching** desde el primer día.
- Dejar el routing multi-proveedor (Gemini/DeepSeek) **fuera del MVP** (coherente con el "Fuera" de E06), pero el diseño lo permite a futuro.

## Fuentes

- [Anthropic — Pricing (docs oficiales)](https://platform.claude.com/docs/en/about-claude/pricing) — Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15, Opus 4.8 $5/$25; caching −90%; batch −50%.
- [BenchLM — Claude API Pricing](https://benchlm.ai/blog/posts/claude-api-pricing)
- [PE Collective — Cross-Provider LLM Pricing (abr 2026)](https://pecollective.com/blog/llm-pricing-comparison-2026/)
- [CloudZero — Claude API Pricing 2026](https://www.cloudzero.com/blog/claude-api-pricing/)
- [Respan — GPT-5 mini vs Gemini Flash vs Claude Haiku (comparativa de modelos rápidos)](https://www.respan.ai/blog/fast-model-comparison)
- [TokenMix — Budget AI Models 2026](https://tokenmix.ai/blog/gpt-5-4-mini-vs-claude-haiku)
