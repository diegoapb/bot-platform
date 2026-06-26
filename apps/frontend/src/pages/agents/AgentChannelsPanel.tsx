import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentChannel } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import { Badge, Button, Card, EmptyState, ErrorText, Loading } from "@/components/ui";

const TYPE_LABEL: Record<string, string> = {
  whatsapp_evolution: "WhatsApp (QR / Baileys)",
  whatsapp_cloud: "WhatsApp Cloud API",
  telegram: "Telegram",
  instagram: "Instagram DM",
  messenger: "Facebook Messenger",
};

const STATUS_LABEL: Record<string, string> = {
  connected: "conectado",
  disconnected: "desconectado",
  error: "error",
  qr: "esperando QR",
};

function statusTone(s: string): "ok" | "warn" | "danger" | "neutral" {
  return s === "connected" ? "ok" : s === "error" ? "danger" : s === "qr" ? "warn" : "neutral";
}

/** Asignación N:M de canales al agente (US-034 R4). Nunca muestra credenciales (P2). */
export function AgentChannelsPanel({ agentId, isAdmin }: { agentId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-channels", agentId],
    queryFn: () => api.listAgentChannels(agentId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["agent-channels", agentId] });

  const link = useMutation({
    mutationFn: (channelId: string) => api.linkChannel(agentId, channelId),
    onSuccess: invalidate,
  });
  const unlink = useMutation({
    mutationFn: (channelId: string) => api.unlinkChannel(agentId, channelId),
    onSuccess: invalidate,
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorText>Error: {(error as Error).message}</ErrorText>;

  const linked = data?.linked ?? [];
  const available = data?.available ?? [];

  const row = (ch: AgentChannel, action: React.ReactNode) => (
    <li key={ch.id}>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-fg">
              {TYPE_LABEL[ch.type] ?? ch.type}
              {ch.displayName && (
                <span className="ml-2 font-mono text-xs text-fg3">{ch.displayName}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge dot tone={statusTone(ch.status)}>
              {STATUS_LABEL[ch.status] ?? ch.status}
            </Badge>
            {action}
          </div>
        </div>
      </Card>
    </li>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 font-display text-lg text-fg">Canales del agente ({linked.length})</h3>
        <ul className="space-y-2">
          {linked.map((ch) =>
            row(
              ch,
              isAdmin ? (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={unlink.isPending}
                  onClick={() => {
                    if (confirm(`¿Quitar ${TYPE_LABEL[ch.type] ?? ch.type} de este agente?`)) {
                      unlink.mutate(ch.id);
                    }
                  }}
                >
                  Quitar
                </Button>
              ) : null,
            ),
          )}
        </ul>
        {linked.length === 0 && (
          <EmptyState title="Sin canales" description="Este agente no atiende ningún canal todavía." />
        )}
        {unlink.isError && <ErrorText className="mt-2">{(unlink.error as Error).message}</ErrorText>}
      </div>

      {isAdmin && (
        <div>
          <h3 className="mb-3 font-display text-lg text-fg">Disponibles ({available.length})</h3>
          <ul className="space-y-2">
            {available.map((ch) =>
              row(
                ch,
                <Button
                  variant="accent"
                  size="sm"
                  disabled={link.isPending}
                  onClick={() => link.mutate(ch.id)}
                >
                  Enlazar
                </Button>,
              ),
            )}
          </ul>
          {available.length === 0 && (
            <p className="text-sm text-fg3">
              No hay canales libres. Conéctalos primero desde el bot; en esta fase cada canal se
              asigna a un solo agente.
            </p>
          )}
          {link.isError && <ErrorText className="mt-2">{(link.error as Error).message}</ErrorText>}
        </div>
      )}
    </div>
  );
}
