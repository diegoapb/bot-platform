import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ConversationMode } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Loading,
  PageHeader,
  Select,
  type BadgeProps,
} from "@/components/ui";

const MODE_BADGE: Record<ConversationMode, { text: string; tone: BadgeProps["tone"] }> = {
  bot: { text: "Bot", tone: "ok" },
  human: { text: "Humano", tone: "warn" },
  paused: { text: "Pausada", tone: "neutral" },
};

/** Panel tenant-wide de conversaciones (US-014 R1), refetch cada 10s. */
export function ConversationsList() {
  const api = useApi();
  const [mode, setMode] = useState<ConversationMode | "">("");
  const [cursor, setCursor] = useState<string | undefined>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["all-conversations", mode, cursor],
    queryFn: () => api.listAllConversations({ mode: mode || undefined, cursor }),
    refetchInterval: 10_000, // 1.4
  });

  return (
    <section>
      <PageHeader
        eyebrow="Conversaciones"
        eyebrowNum="02"
        title="Conversaciones"
        description="Todas las conversaciones de tus bots, ordenadas por actividad."
        actions={
          <Select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as ConversationMode | "");
              setCursor(undefined);
            }}
            className="w-48"
          >
            <option value="">Todos los modos</option>
            <option value="bot">Bot</option>
            <option value="human">Humano</option>
            <option value="paused">Pausada</option>
          </Select>
        }
      />

      {isLoading && <Loading />}
      {error && <ErrorText>{(error as Error).message}</ErrorText>}
      {data?.items.length === 0 && (
        <EmptyState title="Sin conversaciones" description="No hay conversaciones todavía." />
      )}

      <ul className="space-y-2">
        {data?.items.map((c) => {
          const badge = MODE_BADGE[c.mode];
          return (
            <li key={c.id}>
              <Link to={`/conversations/${c.id}`} className="block">
                <Card interactive className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-fg">{c.phoneE164}</p>
                    <p className="text-xs text-fg3">
                      {c.botName} · {new Date(c.lastMsgAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge tone={badge.tone} dot>
                    {badge.text}
                  </Badge>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      {data?.nextCursor && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setCursor(data.nextCursor!)}
        >
          Cargar más
        </Button>
      )}
    </section>
  );
}
