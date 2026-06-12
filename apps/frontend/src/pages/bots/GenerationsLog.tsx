import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { Button, Card, ErrorText, Loading } from "@/components/ui";

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
      {isLoading && <Loading />}
      {error && <ErrorText>{(error as Error).message}</ErrorText>}
      {data?.items.length === 0 && (
        <p className="text-sm text-fg3">
          Sin generaciones todavía. Aparecerán cuando el bot responda mensajes.
        </p>
      )}

      {data?.items.map((g) => (
        <Card key={g.id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-fg2">
                {g.ok ? g.responsePreview : <span className="text-danger">Error: {g.error}</span>}
              </p>
              <p className="font-mono text-xs text-fg3">
                {g.phoneE164} · {g.model} · {new Date(g.createdAt).toLocaleString()}
                {g.latencyMs != null && ` · ${(g.latencyMs / 1000).toFixed(1)}s`}
                {g.inputTokens != null && ` · ${g.inputTokens}→${g.outputTokens} tokens`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setExpanded(expanded === g.id ? null : g.id)}
            >
              {expanded === g.id ? "Cerrar" : "Ver traza"}
            </Button>
          </div>

          {expanded === g.id && detail?.id === g.id && (
            <div className="mt-3 space-y-3 border-t border-line pt-3">
              <div>
                <h4 className="mb-1 font-mono text-xs uppercase tracking-wide text-fg3">Prompt</h4>
                <pre className="max-h-64 overflow-auto rounded-sm border border-line bg-soft p-3 font-mono text-xs text-fg2">
                  {JSON.stringify(detail.prompt, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="mb-1 font-mono text-xs uppercase tracking-wide text-fg3">
                  Respuesta
                </h4>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-sm border border-line bg-soft p-3 font-mono text-xs text-fg2">
                  {detail.response ?? detail.error ?? "—"}
                </pre>
              </div>
            </div>
          )}
        </Card>
      ))}

      {data?.nextCursor && (
        <Button variant="outline" onClick={() => setCursor(data.nextCursor!)}>
          Cargar más
        </Button>
      )}
    </div>
  );
}
