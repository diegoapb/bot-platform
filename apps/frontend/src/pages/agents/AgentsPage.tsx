import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BrainCircuit, ChevronRight } from "lucide-react";
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
  paused: "warn",
};

/** Lista de agentes del tenant + creación (US-034 R1, R2). */
export function AgentsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";
  const [name, setName] = useState("");

  const { data: agents, isLoading, error, refetch } = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.listAgents(),
  });

  const createAgent = useMutation({
    mutationFn: () => api.createAgent({ name: name.trim() }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  return (
    <section>
      <PageHeader
        eyebrow="Agentes"
        eyebrowNum="01"
        title="Tus agentes"
        description="El agente es el cerebro: identidad, modelo y conocimiento, independiente de los canales por los que atiende."
      />

      {isAdmin && (
        <form
          className="mb-8 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createAgent.mutate();
          }}
        >
          <Input
            className="flex-1"
            placeholder="Nombre del nuevo agente"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={createAgent.isPending || !name.trim()}>
            {createAgent.isPending ? "Creando…" : "Crear agente"}
          </Button>
        </form>
      )}

      {createAgent.error && (
        <ErrorText className="mb-4">{(createAgent.error as Error).message}</ErrorText>
      )}
      {isLoading && <Loading />}
      {error && (
        <div className="space-y-2">
          <ErrorText>Error: {(error as Error).message}</ErrorText>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {agents?.map((agent) => (
          <li key={agent.id}>
            <Link to={`/agents/${agent.id}`} className="block">
              <Card interactive className="group p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-forest text-lime">
                      <BrainCircuit className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-lg leading-tight text-fg">{agent.name}</p>
                      <p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-fg3">
                        {agent.channelCount ?? 0} canal(es)
                      </p>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[agent.status] ?? "neutral"} dot>
                    {agent.status}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-end border-t border-line pt-3 text-sm text-fg2">
                  <ChevronRight className="h-4 w-4 text-fg3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {agents?.length === 0 && (
        <EmptyState
          icon={<BrainCircuit className="h-7 w-7" />}
          title="Sin agentes todavía"
          description={
            isAdmin
              ? "Aún no hay agentes en este tenant. Crea el primero arriba."
              : "No tienes agentes asignados todavía."
          }
        />
      )}
    </section>
  );
}
