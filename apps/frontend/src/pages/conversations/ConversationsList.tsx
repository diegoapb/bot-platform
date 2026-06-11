import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ConversationMode } from "@bot/shared";
import { useApi } from "@/lib/useApi";

const MODE_BADGE: Record<ConversationMode, { text: string; cls: string }> = {
  bot: { text: "Bot", cls: "bg-green-100 text-green-800" },
  human: { text: "Humano", cls: "bg-orange-100 text-orange-800" },
  paused: { text: "Pausada", cls: "bg-gray-200 text-gray-700" },
};

/** Panel tenant-wide de conversaciones (US-014 R1), refetch cada 10s. */
export function ConversationsList() {
  const api = useApi();
  const [mode, setMode] = useState<ConversationMode | "">("");
  const [cursor, setCursor] = useState<string | undefined>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["all-conversations", mode, cursor],
    queryFn: () =>
      api.listAllConversations({ mode: mode || undefined, cursor }),
    refetchInterval: 10_000, // 1.4
  });

  return (
    <section>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conversaciones</h1>
          <p className="text-sm text-muted-foreground">
            Todas las conversaciones de tus bots, ordenadas por actividad.
          </p>
        </div>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as ConversationMode | "");
            setCursor(undefined);
          }}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todos los modos</option>
          <option value="bot">Bot</option>
          <option value="human">Humano</option>
          <option value="paused">Pausada</option>
        </select>
      </header>

      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      {data?.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay conversaciones todavía.</p>
      )}

      <ul className="space-y-2">
        {data?.items.map((c) => {
          const badge = MODE_BADGE[c.mode];
          return (
            <li key={c.id}>
              <Link
                to={`/conversations/${c.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium">{c.phoneE164}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.botName} · {new Date(c.lastMsgAt).toLocaleString()}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>
                  {badge.text}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {data?.nextCursor && (
        <button
          onClick={() => setCursor(data.nextCursor!)}
          className="mt-4 rounded-md border px-4 py-2 text-sm"
        >
          Cargar más
        </button>
      )}
    </section>
  );
}
