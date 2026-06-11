import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";

/** Log de generaciones del LLM por bot (US-014 R3). Solo admin. */
export function GenerationsLog({ botId }: { botId: string }) {
  const api = useApi();
  const [cursor, setCursor] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["generations", botId, cursor],
    queryFn: () => api.listGenerations(botId, cursor),
  });

  const { data: detail } = useQuery({
    queryKey: ["generation", expanded],
    queryFn: () => api.getGeneration(expanded!),
    enabled: !!expanded,
  });

  return (
    <div className="space-y-2">
      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      {data?.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sin generaciones todavía. Aparecerán cuando el bot responda mensajes.
        </p>
      )}

      {data?.items.map((g) => (
        <div key={g.id} className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm">
                {g.ok ? (
                  g.responsePreview
                ) : (
                  <span className="text-red-600">Error: {g.error}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {g.phoneE164} · {g.model} · {new Date(g.createdAt).toLocaleString()}
                {g.latencyMs != null && ` · ${(g.latencyMs / 1000).toFixed(1)}s`}
                {g.inputTokens != null && ` · ${g.inputTokens}→${g.outputTokens} tokens`}
              </p>
            </div>
            <button
              onClick={() => setExpanded(expanded === g.id ? null : g.id)}
              className="shrink-0 rounded-md border px-2 py-1 text-xs"
            >
              {expanded === g.id ? "Cerrar" : "Ver traza"}
            </button>
          </div>

          {expanded === g.id && detail?.id === g.id && (
            <div className="mt-3 space-y-3 border-t pt-3">
              <div>
                <h4 className="mb-1 text-xs font-medium text-muted-foreground">Prompt</h4>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted/40 p-3 text-xs">
                  {JSON.stringify(detail.prompt, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium text-muted-foreground">Respuesta</h4>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                  {detail.response ?? detail.error ?? "—"}
                </pre>
              </div>
            </div>
          )}
        </div>
      ))}

      {data?.nextCursor && (
        <button
          onClick={() => setCursor(data.nextCursor!)}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Cargar más
        </button>
      )}
    </div>
  );
}
