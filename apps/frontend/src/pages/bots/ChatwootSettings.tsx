import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { Button, Card, ErrorText, Loading } from "@/components/ui";

/** Provisión de Chatwoot del bot + alta de agentes del tenant. */
export function ChatwootSettings({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [addedAgents, setAddedAgents] = useState<Set<string>>(new Set());

  const { data: cw, isLoading } = useQuery({
    queryKey: ["chatwoot", botId],
    queryFn: () => api.getChatwoot(botId),
  });

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => api.listMembers(),
    enabled: isAdmin && !!cw?.accountId,
  });

  const provision = useMutation({
    mutationFn: () => api.provisionChatwoot(botId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatwoot", botId] }),
  });

  const addAgent = useMutation({
    mutationFn: (userId: string) => api.addChatwootAgent(botId, userId),
    onSuccess: (_d, userId) => setAddedAgents((s) => new Set(s).add(userId)),
  });

  if (isLoading) return <Loading />;

  const provisioned = !!cw?.accountId && !!cw?.inboxId;

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-fg">
              {provisioned ? "Chatwoot provisionado" : "Chatwoot sin provisionar"}
            </p>
            <p className="mt-0.5 text-sm text-fg3">
              {provisioned
                ? `Cuenta #${cw!.accountId} · Inbox #${cw!.inboxId}`
                : "Crea la cuenta e inbox del tenant para centralizar la atención."}
            </p>
          </div>
          {provisioned ? (
            cw!.dashboardUrl && (
              <a href={cw!.dashboardUrl} target="_blank" rel="noreferrer">
                <Button variant="outline">Abrir Chatwoot ↗</Button>
              </a>
            )
          ) : (
            isAdmin && (
              <Button onClick={() => provision.mutate()} disabled={provision.isPending}>
                {provision.isPending ? "Provisionando…" : "Provisionar"}
              </Button>
            )
          )}
        </div>
        {provision.error && (
          <ErrorText className="mt-2">{(provision.error as Error).message}</ErrorText>
        )}
      </Card>

      {isAdmin && provisioned && (
        <div>
          <h3 className="mb-3 font-display text-lg text-fg">Agentes</h3>
          <ul className="space-y-2">
            {members?.map((m) => (
              <li key={m.userId}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-fg">{m.name}</p>
                    <p className="text-xs text-fg3">{m.email}</p>
                  </div>
                  {addedAgents.has(m.userId) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-ok">
                      <Check className="h-3.5 w-3.5" /> Agente dado de alta
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAgent.mutate(m.userId)}
                      disabled={addAgent.isPending}
                    >
                      Dar de alta en Chatwoot
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
          {addAgent.error && (
            <ErrorText className="mt-2">{(addAgent.error as Error).message}</ErrorText>
          )}
        </div>
      )}
    </div>
  );
}
