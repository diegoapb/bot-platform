import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ConversationMode } from "@bot/shared";
import { useApi } from "@/lib/useApi";

const MODE_BADGE: Record<ConversationMode, { text: string; cls: string }> = {
  bot: { text: "Bot", cls: "bg-green-100 text-green-800" },
  human: { text: "Humano", cls: "bg-orange-100 text-orange-800" },
  paused: { text: "Pausada", cls: "bg-gray-200 text-gray-700" },
};

const CAUSE_LABEL: Record<string, string> = {
  "llm:request_human": "El bot escaló a humano",
  "llm:error": "Fallo del bot",
  "panel:user": "Cambio manual desde el panel",
  "chatwoot:agent": "Agente tomó la conversación en Chatwoot",
  system: "Sistema",
};

/** Conversaciones del bot con estado y handoff manual (US-011/US-012). */
export function ConversationsPanel({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: convos } = useQuery({
    queryKey: ["conversations", botId],
    queryFn: () => api.listConversations(botId),
    refetchInterval: 5000, // 4.2: el panel refleja el modo en <5s.
  });

  const { data: transitions } = useQuery({
    queryKey: ["transitions", expanded],
    queryFn: () => api.listTransitions(expanded!),
    enabled: !!expanded,
  });

  const setMode = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: ConversationMode }) =>
      api.setConversationMode(id, mode),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["conversations", botId] });
      qc.invalidateQueries({ queryKey: ["transitions", id] });
    },
  });

  return (
    <div className="space-y-3">
      {convos?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aún no hay conversaciones. Llegarán cuando los clientes escriban por WhatsApp.
        </p>
      )}
      {convos?.map((c) => {
        const badge = MODE_BADGE[c.mode];
        return (
          <div key={c.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{c.phoneE164}</p>
                <p className="text-xs text-muted-foreground">
                  Último mensaje: {new Date(c.lastMsgAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>{badge.text}</span>
                {c.mode !== "human" && (
                  <button
                    onClick={() => setMode.mutate({ id: c.id, mode: "human" })}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Tomar
                  </button>
                )}
                {c.mode !== "bot" && (
                  <button
                    onClick={() => setMode.mutate({ id: c.id, mode: "bot" })}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Devolver al bot
                  </button>
                )}
                {isAdmin && c.mode !== "paused" && (
                  <button
                    onClick={() => setMode.mutate({ id: c.id, mode: "paused" })}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Pausar
                  </button>
                )}
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="text-xs text-muted-foreground underline"
                >
                  {expanded === c.id ? "Ocultar" : "Historial"}
                </button>
              </div>
            </div>
            {expanded === c.id && (
              <ul className="mt-3 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                {transitions?.length === 0 && <li>Sin transiciones registradas.</li>}
                {transitions?.map((t) => (
                  <li key={t.id}>
                    {new Date(t.createdAt).toLocaleString()} · {t.fromMode} → {t.toMode} ·{" "}
                    {CAUSE_LABEL[t.cause] ?? t.cause}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {setMode.error && <p className="text-sm text-red-600">{(setMode.error as Error).message}</p>}
    </div>
  );
}
