import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "@/lib/useApi";
import { ConnectWhatsApp } from "./ConnectWhatsApp";
import { ChatwootSettings } from "./ChatwootSettings";
import { IdentityEditor } from "./IdentityEditor";

const TABS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "chatwoot", label: "Chatwoot" },
  { key: "identity", label: "Identidad" },
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

  if (isLoading) return <p className="text-muted-foreground">Cargando…</p>;
  if (error || !bot)
    return <p className="text-red-600">Error: {(error as Error)?.message ?? "No encontrado"}</p>;

  return (
    <section>
      <header className="mb-6">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← Bots
        </Link>
        <h1 className="text-2xl font-semibold">{bot.name}</h1>
        <p className="text-sm text-muted-foreground">
          {bot.channel} · {bot.status}
        </p>
      </header>

      <nav className="mb-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm ${
              tab === t.key ? "border-b-2 border-primary font-medium" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "whatsapp" && <ConnectWhatsApp botId={bot.id} isAdmin={isAdmin} />}
      {tab === "chatwoot" && <ChatwootSettings botId={bot.id} isAdmin={isAdmin} />}
      {tab === "identity" && <IdentityEditor botId={bot.id} isAdmin={isAdmin} />}
    </section>
  );
}
