import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { ConversationMode } from "@bot/shared";
import { useApi } from "@/lib/useApi";

const ORIGIN_STYLE: Record<string, { label: string; cls: string; align: string }> = {
  cliente: { label: "Cliente", cls: "bg-muted", align: "mr-auto" },
  bot: { label: "Bot", cls: "bg-green-100", align: "ml-auto" },
  agente: { label: "Agente", cls: "bg-blue-100", align: "ml-auto" },
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
        <Link to="/conversations" className="text-sm text-muted-foreground hover:underline">
          ← Conversaciones
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Conversación</h1>
          <div className="flex gap-2">
            {currentMode !== "human" && (
              <button
                onClick={() => setMode.mutate("human")}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Tomar
              </button>
            )}
            {currentMode !== "bot" && (
              <button
                onClick={() => setMode.mutate("bot")}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Devolver al bot
              </button>
            )}
            {isAdmin && currentMode !== "paused" && (
              <button
                onClick={() => setMode.mutate("paused")}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Pausar
              </button>
            )}
          </div>
        </div>
        {setMode.error && (
          <p className="text-sm text-red-600">{(setMode.error as Error).message}</p>
        )}
      </header>

      {isLoading && <p className="text-muted-foreground">Cargando historial…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}

      <div className="space-y-2">
        {messages?.map((m) => {
          const style = ORIGIN_STYLE[m.origin] ?? ORIGIN_STYLE.cliente!;
          return (
            <div key={m.id} className={`max-w-[80%] rounded-lg p-3 ${style.cls} ${style.align}`}>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {style.label}
                {m.senderName && m.origin === "agente" ? ` · ${m.senderName}` : ""} ·{" "}
                {new Date(m.createdAt).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
            </div>
          );
        })}
        {messages?.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin mensajes.</p>
        )}
      </div>

      {transitions && transitions.length > 0 && (
        <div className="mt-8 border-t pt-4">
          <h3 className="mb-2 text-sm font-medium">Historial de transiciones</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {transitions.map((t) => (
              <li key={t.id}>
                {new Date(t.createdAt).toLocaleString()} · {t.fromMode} → {t.toMode} ·{" "}
                {CAUSE_LABEL[t.cause] ?? t.cause}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
