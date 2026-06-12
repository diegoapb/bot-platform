import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ConversationMode } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import { Badge, Button, Card, ErrorText, type BadgeProps } from "@/components/ui";

const MODE_BADGE: Record<ConversationMode, { text: string; tone: BadgeProps["tone"] }> = {
  bot: { text: "Bot", tone: "ok" },
  human: { text: "Humano", tone: "warn" },
  paused: { text: "Pausada", tone: "neutral" },
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
        <p className="text-sm text-fg3">
          Aún no hay conversaciones. Llegarán cuando los clientes escriban por WhatsApp.
        </p>
      )}
      {convos?.map((c) => {
        const badge = MODE_BADGE[c.mode];
        return (
          <Card key={c.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-fg">{c.phoneE164}</p>
                <p className="text-xs text-fg3">
                  Último mensaje: {new Date(c.lastMsgAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={badge.tone} dot>
                  {badge.text}
                </Badge>
                {c.mode !== "human" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMode.mutate({ id: c.id, mode: "human" })}
                  >
                    Tomar
                  </Button>
                )}
                {c.mode !== "bot" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMode.mutate({ id: c.id, mode: "bot" })}
                  >
                    Devolver al bot
                  </Button>
                )}
                {isAdmin && c.mode !== "paused" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode.mutate({ id: c.id, mode: "paused" })}
                  >
                    Pausar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  {expanded === c.id ? "Ocultar" : "Historial"}
                </Button>
              </div>
            </div>
            {expanded === c.id && (
              <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs text-fg3">
                {transitions?.length === 0 && <li>Sin transiciones registradas.</li>}
                {transitions?.map((t) => (
                  <li key={t.id}>
                    {new Date(t.createdAt).toLocaleString()} · {t.fromMode} → {t.toMode} ·{" "}
                    {CAUSE_LABEL[t.cause] ?? t.cause}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
      {setMode.error && <ErrorText>{(setMode.error as Error).message}</ErrorText>}
    </div>
  );
}
