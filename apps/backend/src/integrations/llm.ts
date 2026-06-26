import { env } from "../env.js";

/**
 * Cliente del LLM (Anthropic Messages API, fetch directo como el resto de
 * integraciones). Soporta tool-use con loop de ejecución delegado al caller
 * y timeout duro vía AbortController.
 */
export class LlmError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`LLM API ${status}: ${body}`);
  }
}

export type LlmTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type LlmMessage = {
  role: "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export type LlmResult = {
  /** Bloques de contenido crudos (text / tool_use). */
  content: Array<{ type: string; [k: string]: unknown }>;
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export async function generate(opts: {
  system: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  maxTokens?: number;
  // E13/US-030: modelo efectivo del agente. Si se omite, cae al modelo global.
  model?: string;
}): Promise<LlmResult> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new LlmError(0, "ANTHROPIC_API_KEY no configurada");
  }
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.LLM_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: opts.model ?? env.LLM_MODEL,
        max_tokens: opts.maxTokens ?? 1024,
        system: opts.system,
        messages: opts.messages,
        ...(opts.tools?.length ? { tools: opts.tools } : {}),
      }),
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new LlmError(0, aborted ? `timeout tras ${env.LLM_TIMEOUT_MS}ms` : (e as Error).message);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new LlmError(res.status, await res.text());
  const json = (await res.json()) as {
    content: Array<{ type: string; [k: string]: unknown }>;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  };
  return {
    content: json.content,
    stopReason: json.stop_reason,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    latencyMs: Date.now() - started,
  };
}

/** Concatena los bloques de texto de una respuesta. */
export function textOf(result: LlmResult): string {
  return result.content
    .filter((b) => b.type === "text")
    .map((b) => String((b as { text?: string }).text ?? ""))
    .join("\n")
    .trim();
}
