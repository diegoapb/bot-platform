import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { Badge, ErrorText, Loading, Switch, Tabs } from "@/components/ui";
import { ConnectWhatsApp } from "./ConnectWhatsApp";
import { ChatwootSettings } from "./ChatwootSettings";
import { AudienceSettings } from "./AudienceSettings";
import { IdentityEditor } from "./IdentityEditor";
import { KnowledgeManager } from "./KnowledgeManager";
import { CatalogManager } from "./CatalogManager";
import { ConversationsPanel } from "./ConversationsPanel";
import { ContactsPanel } from "./ContactsPanel";
import { GenerationsLog } from "./GenerationsLog";
import { ChannelsPanel } from "./ChannelsPanel";
import { ExtractionSettings } from "./ExtractionSettings";

const TABS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "channels", label: "Canales" },
  { key: "chatwoot", label: "Chatwoot" },
  { key: "audience", label: "Audiencia" },
  { key: "identity", label: "Identidad" },
  { key: "knowledge", label: "Conocimiento" },
  { key: "catalog", label: "Catálogo" },
  { key: "conversations", label: "Conversaciones" },
  { key: "contacts", label: "Contactos" },
  { key: "extraction", label: "Extracción" },
  { key: "generations", label: "Trazas", adminOnly: true },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_LABEL: Record<string, string> = {
  active: "activo",
  paused: "pausado",
  draft: "borrador",
};

export function BotDetailPage() {
  const { botId } = useParams<{ botId: string }>();
  const api = useApi();
  const qc = useQueryClient();
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";
  const [tab, setTab] = useState<TabKey>("whatsapp");

  const { data: bot, isLoading, error } = useQuery({
    queryKey: ["bot", botId],
    queryFn: () => api.getBot(botId!),
    enabled: !!botId,
  });

  // E10/US-020: activar o pausar el bot a nivel global desde el dashboard.
  const setActivation = useMutation({
    mutationFn: (active: boolean) => api.setBotActivation(botId!, active),
    onSuccess: (updated) => {
      qc.setQueryData(["bot", botId], updated);
      qc.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  if (isLoading) return <Loading />;
  if (error || !bot)
    return <ErrorText>Error: {(error as Error)?.message ?? "No encontrado"}</ErrorText>;

  const visibleTabs = TABS.filter((t) => !("adminOnly" in t && t.adminOnly) || isAdmin);
  const isActive = bot.status === "active";

  return (
    <section>
      <header className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-fg3 transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Bots
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg">
            {bot.name}
          </h1>
          <Badge tone={isActive ? "ok" : bot.status === "paused" ? "warn" : "neutral"} mono dot>
            {STATUS_LABEL[bot.status] ?? bot.status}
          </Badge>
          {isAdmin && (
            <Switch
              checked={isActive}
              disabled={setActivation.isPending}
              label={isActive ? "Bot activo" : "Bot pausado"}
              onChange={(next) => {
                if (
                  !next &&
                  !confirm(
                    "¿Pausar el bot? Dejará de responder automáticamente en todos los canales; los mensajes seguirán llegando a Chatwoot para atención humana.",
                  )
                ) {
                  return;
                }
                setActivation.mutate(next);
              }}
            />
          )}
        </div>
        {setActivation.isError && (
          <ErrorText className="mt-2">
            {(setActivation.error as Error)?.message ?? "No se pudo cambiar la activación"}
          </ErrorText>
        )}
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-fg3">
          {bot.channel}
        </p>
      </header>

      <Tabs
        className="mb-8"
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={visibleTabs.map((t) => ({ key: t.key, label: t.label }))}
      />

      {tab === "whatsapp" && <ConnectWhatsApp botId={bot.id} isAdmin={isAdmin} />}
      {tab === "channels" && <ChannelsPanel botId={bot.id} isAdmin={isAdmin} />}
      {tab === "chatwoot" && <ChatwootSettings botId={bot.id} isAdmin={isAdmin} />}
      {tab === "audience" && <AudienceSettings botId={bot.id} isAdmin={isAdmin} />}
      {tab === "identity" && <IdentityEditor botId={bot.id} isAdmin={isAdmin} />}
      {tab === "knowledge" && <KnowledgeManager botId={bot.id} isAdmin={isAdmin} />}
      {tab === "catalog" && <CatalogManager botId={bot.id} isAdmin={isAdmin} />}
      {tab === "conversations" && <ConversationsPanel botId={bot.id} isAdmin={isAdmin} />}
      {tab === "contacts" && <ContactsPanel botId={bot.id} isAdmin={isAdmin} />}
      {tab === "extraction" && <ExtractionSettings botId={bot.id} isAdmin={isAdmin} />}
      {tab === "generations" && isAdmin && <GenerationsLog botId={bot.id} />}
    </section>
  );
}
