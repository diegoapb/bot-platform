import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { Badge, ErrorText, Loading, Tabs } from "@/components/ui";
import { ConnectWhatsApp } from "./ConnectWhatsApp";
import { ChatwootSettings } from "./ChatwootSettings";
import { AudienceSettings } from "./AudienceSettings";
import { IdentityEditor } from "./IdentityEditor";
import { KnowledgeManager } from "./KnowledgeManager";
import { CatalogManager } from "./CatalogManager";
import { ConversationsPanel } from "./ConversationsPanel";
import { ContactsPanel } from "./ContactsPanel";
import { GenerationsLog } from "./GenerationsLog";

const TABS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "chatwoot", label: "Chatwoot" },
  { key: "audience", label: "Audiencia" },
  { key: "identity", label: "Identidad" },
  { key: "knowledge", label: "Conocimiento" },
  { key: "catalog", label: "Catálogo" },
  { key: "conversations", label: "Conversaciones" },
  { key: "contacts", label: "Contactos" },
  { key: "generations", label: "Trazas", adminOnly: true },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function BotDetailPage() {
  const { botId } = useParams<{ botId: string }>();
  const api = useApi();
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";
  const [tab, setTab] = useState<TabKey>("whatsapp");

  const { data: bot, isLoading, error } = useQuery({
    queryKey: ["bot", botId],
    queryFn: () => api.getBot(botId!),
    enabled: !!botId,
  });

  if (isLoading) return <Loading />;
  if (error || !bot)
    return <ErrorText>Error: {(error as Error)?.message ?? "No encontrado"}</ErrorText>;

  const visibleTabs = TABS.filter((t) => !("adminOnly" in t && t.adminOnly) || isAdmin);

  return (
    <section>
      <header className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-fg3 transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Bots
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg">
            {bot.name}
          </h1>
          <Badge tone="neutral" mono>
            {bot.status}
          </Badge>
        </div>
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
      {tab === "chatwoot" && <ChatwootSettings botId={bot.id} isAdmin={isAdmin} />}
      {tab === "audience" && <AudienceSettings botId={bot.id} isAdmin={isAdmin} />}
      {tab === "identity" && <IdentityEditor botId={bot.id} isAdmin={isAdmin} />}
      {tab === "knowledge" && <KnowledgeManager botId={bot.id} isAdmin={isAdmin} />}
      {tab === "catalog" && <CatalogManager botId={bot.id} isAdmin={isAdmin} />}
      {tab === "conversations" && <ConversationsPanel botId={bot.id} isAdmin={isAdmin} />}
      {tab === "contacts" && <ContactsPanel botId={bot.id} isAdmin={isAdmin} />}
      {tab === "generations" && isAdmin && <GenerationsLog botId={bot.id} />}
    </section>
  );
}
