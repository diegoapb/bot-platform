import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ConversationMode } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import { Button, Card, ErrorText, Loading } from "@/components/ui";
import { cn } from "@/lib/utils";

const ORIGIN_STYLE: Record<string, { label: string; cls: string; align: string }> = {
  cliente: { label: "Cliente", cls: "bg-chip text-fg", align: "mr-auto" },
  bot: { label: "Bot", cls: "bg-forest text-beige", align: "ml-auto" },
  agente: { label: "Agente", cls: "bg-info-bg text-fg", align: "ml-auto" },
};

const CAUSE_LABEL: Record<string, string> = {
  "llm:request_human": "El bot escaló a humano",
  "llm:error": "Fallo del bot",
  "panel:user": "Cambio manual desde el panel",
  "chatwoot:agent": "Agente tomó la conversación en Chatwoot",
  system: "Sistema",
};

/** Vista de una conversación: historial con origen + control de modo (US-014 1.2–1.3). */
export function ConversationView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const api = useApi();
  const qc = useQueryClient();
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ["convo-messages", conversationId],
    queryFn: () => api.getConversationMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 10_000,
  });

  const { data: transitions } = useQuery({
    queryKey: ["transitions", conversationId],
    queryFn: () => api.listTransitions(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 10_000,
  });

  const setMode = useMutation({
    mutationFn: (mode: ConversationMode) => api.setConversationMode(conversationId!, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transitions", conversationId] });
      qc.invalidateQueries({ queryKey: ["all-conversations"] });
    },
  });

  const currentMode = transitions?.[0]?.toMode ?? "bot";

  return (
    <section>
      <header className="mb-6">
        <Link
          to="/conversations"
          className="inline-flex items-center gap-1.5 text-sm text-fg3 transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Conversaciones
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg">
            Conversación
          </h1>
          <div className="flex gap-2">
            {currentMode !== "human" && (
              <Button variant="outline" size="sm" onClick={() => setMode.mutate("human")}>
                Tomar
              </Button>
            )}
            {currentMode !== "bot" && (
              <Button variant="outline" size="sm" onClick={() => setMode.mutate("bot")}>
                Devolver al bot
              </Button>
            )}
            {isAdmin && currentMode !== "paused" && (
              <Button variant="ghost" size="sm" onClick={() => setMode.mutate("paused")}>
                Pausar
              </Button>
            )}
          </div>
        </div>
        {setMode.error && (
          <ErrorText className="mt-2">{(setMode.error as Error).message}</ErrorText>
        )}
      </header>

      {isLoading && <Loading>Cargando historial…</Loading>}
      {error && <ErrorText>{(error as Error).message}</ErrorText>}

      <div className="space-y-2">
        {messages?.map((m) => {
          const style = ORIGIN_STYLE[m.origin] ?? ORIGIN_STYLE.cliente!;
          return (
            <div
              key={m.id}
              className={cn("max-w-[80%] rounded-lg p-3", style.cls, style.align)}
            >
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wide opacity-70">
                {style.label}
                {m.senderName && m.origin === "agente" ? ` · ${m.senderName}` : ""} ·{" "}
                {new Date(m.createdAt).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
            </div>
          );
        })}
        {messages?.length === 0 && <p className="text-sm text-fg3">Sin mensajes.</p>}
      </div>

      {transitions && transitions.length > 0 && (
        <Card className="mt-8 p-4">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-fg3">
            Historial de transiciones
          </h3>
          <ul className="space-y-1 text-xs text-fg3">
            {transitions.map((t) => (
              <li key={t.id}>
                {new Date(t.createdAt).toLocaleString()} · {t.fromMode} → {t.toMode} ·{" "}
                {CAUSE_LABEL[t.cause] ?? t.cause}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
