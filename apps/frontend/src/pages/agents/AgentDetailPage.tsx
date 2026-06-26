import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { Badge, EmptyState, ErrorText, Loading, Tabs } from "@/components/ui";
import { IdentityEditor } from "./IdentityEditor";
import { ModelSelector } from "./ModelSelector";
import { AgentChannelsPanel } from "./AgentChannelsPanel";
import { AgentKnowledgePanel } from "./AgentKnowledgePanel";

const TABS = [
  { key: "identity", label: "Identidad" },
  { key: "model", label: "Modelo" },
  { key: "channels", label: "Canales" },
  { key: "knowledge", label: "Conocimiento" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_LABEL: Record<string, string> = {
  active: "activo",
  paused: "pausado",
  draft: "borrador",
};

/** Detalle del agente con pestañas (US-034 R3–R6). */
export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const api = useApi();
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";
  const [tab, setTab] = useState<TabKey>("identity");

  const { data: agent, isLoading, error } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => api.getAgent(agentId!),
    enabled: !!agentId,
    retry: false,
  });

  if (isLoading) return <Loading />;
  // El backend devuelve 404 si el member no tiene acceso (6.4).
  if (error || !agent) {
    return (
      <EmptyState
        title="Acceso no permitido"
        description="No tienes acceso a este agente o no existe."
        action={
          <Link to="/agents" className="text-sm text-accent hover:underline">
            Volver a agentes
          </Link>
        }
      />
    );
  }

  const isActive = agent.status === "active";

  return (
    <section>
      <header className="mb-6">
        <Link
          to="/agents"
          className="inline-flex items-center gap-1.5 text-sm text-fg3 transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Agentes
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg">
            {agent.name}
          </h1>
          <Badge tone={isActive ? "ok" : agent.status === "paused" ? "warn" : "neutral"} mono dot>
            {STATUS_LABEL[agent.status] ?? agent.status}
          </Badge>
        </div>
        {!isAdmin && (
          <p className="mt-2 text-sm text-fg3">Modo solo lectura (member).</p>
        )}
      </header>

      <Tabs
        className="mb-8"
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={TABS.map((t) => ({ key: t.key, label: t.label }))}
      />

      {tab === "identity" && <IdentityEditor agentId={agent.id} isAdmin={isAdmin} />}
      {tab === "model" && (
        <ModelSelector agentId={agent.id} model={agent.model} isAdmin={isAdmin} />
      )}
      {tab === "channels" && <AgentChannelsPanel agentId={agent.id} isAdmin={isAdmin} />}
      {tab === "knowledge" && <AgentKnowledgePanel agentId={agent.id} isAdmin={isAdmin} />}

      {error && <ErrorText className="mt-4">{(error as Error).message}</ErrorText>}
    </section>
  );
}
