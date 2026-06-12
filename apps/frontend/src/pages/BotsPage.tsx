import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot as BotIcon, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Input,
  Loading,
  PageHeader,
} from "@/components/ui";

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  active: "ok",
  draft: "neutral",
  disabled: "warn",
};

export function BotsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";
  const [name, setName] = useState("");

  const { data: bots, isLoading, error } = useQuery({
    queryKey: ["bots"],
    queryFn: () => api.listBots(),
  });

  const createBot = useMutation({
    mutationFn: () =>
      api.createBot({ name, channel: "whatsapp", evolutionInstance: null, chatwootInboxId: null }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  return (
    <section>
      <PageHeader
        eyebrow="Bots"
        eyebrowNum="01"
        title="Tus bots"
        description="Cada bot conecta un número de WhatsApp con su identidad, conocimiento y conversaciones."
      />

      {isAdmin && (
        <form
          className="mb-8 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createBot.mutate();
          }}
        >
          <Input
            className="flex-1"
            placeholder="Nombre del nuevo bot"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={createBot.isPending || !name.trim()}>
            {createBot.isPending ? "Creando…" : "Crear bot"}
          </Button>
        </form>
      )}

      {createBot.error && (
        <ErrorText className="mb-4">{(createBot.error as Error).message}</ErrorText>
      )}
      {isLoading && <Loading />}
      {error && <ErrorText>Error: {(error as Error).message}</ErrorText>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {bots?.map((bot) => (
          <li key={bot.id}>
            <Link to={`/bots/${bot.id}`} className="block">
              <Card interactive className="group p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-forest text-lime">
                      <BotIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-lg leading-tight text-fg">{bot.name}</p>
                      <p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-fg3">
                        {bot.channel}
                      </p>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[bot.status] ?? "neutral"} dot>
                    {bot.status}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm text-fg2">
                  <span>
                    Instancia: {bot.evolutionInstance ?? "—"} · {bot.connectionStatus}
                  </span>
                  <ChevronRight className="h-4 w-4 text-fg3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {bots?.length === 0 && (
        <EmptyState
          icon={<BotIcon className="h-7 w-7" />}
          title="Sin bots todavía"
          description={
            isAdmin
              ? "Aún no hay bots en este tenant. Crea el primero arriba."
              : "No tienes bots asignados todavía."
          }
        />
      )}
    </section>
  );
}
