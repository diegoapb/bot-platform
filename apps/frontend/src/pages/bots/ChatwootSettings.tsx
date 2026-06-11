import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";

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

  if (isLoading) return <p className="text-muted-foreground">Cargando…</p>;

  const provisioned = !!cw?.accountId && !!cw?.inboxId;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {provisioned ? "Chatwoot provisionado" : "Chatwoot sin provisionar"}
            </p>
            <p className="text-sm text-muted-foreground">
              {provisioned
                ? `Cuenta #${cw!.accountId} · Inbox #${cw!.inboxId}`
                : "Crea la cuenta e inbox del tenant para centralizar la atención."}
            </p>
          </div>
          {provisioned ? (
            cw!.dashboardUrl && (
              <a
                href={cw!.dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border px-4 py-2 text-sm"
              >
                Abrir Chatwoot ↗
              </a>
            )
          ) : (
            isAdmin && (
              <button
                onClick={() => provision.mutate()}
                disabled={provision.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {provision.isPending ? "Provisionando…" : "Provisionar"}
              </button>
            )
          )}
        </div>
        {provision.error && (
          <p className="mt-2 text-sm text-red-600">{(provision.error as Error).message}</p>
        )}
      </div>

      {isAdmin && provisioned && (
        <div>
          <h3 className="mb-2 font-medium">Agentes</h3>
          <ul className="space-y-2">
            {members?.map((m) => (
              <li key={m.userId} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                {addedAgents.has(m.userId) ? (
                  <span className="text-xs text-green-600">Agente dado de alta ✓</span>
                ) : (
                  <button
                    onClick={() => addAgent.mutate(m.userId)}
                    disabled={addAgent.isPending}
                    className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Dar de alta en Chatwoot
                  </button>
                )}
              </li>
            ))}
          </ul>
          {addAgent.error && (
            <p className="mt-2 text-sm text-red-600">{(addAgent.error as Error).message}</p>
          )}
        </div>
      )}
    </div>
  );
}
