import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { IDENTITY_TYPES, IDENTITY_TEMPLATES, IDENTITY_MAX_CHARS } from "@bot/shared";
import type { IdentityType } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import { Button, Card, ErrorText, Loading, Tabs, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

const LABELS: Record<IdentityType, string> = {
  SOUL: "SOUL.md",
  IDENTITY: "IDENTITY.md",
  GUARDRAILS: "GUARDRAILS.md",
};

/** Editor de identidad versionada del agente con historial y restore (US-034 R3). */
export function IdentityEditor({ agentId, isAdmin }: { agentId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [type, setType] = useState<IdentityType>("SOUL");
  const [content, setContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["agent-identity", agentId],
    queryFn: () => api.getAgentIdentity(agentId),
  });

  const { data: versions } = useQuery({
    queryKey: ["agent-identity-versions", agentId, type],
    queryFn: () => api.listAgentIdentityVersions(agentId, type),
    enabled: showHistory,
  });

  const current = docs?.[type] ?? null;

  useEffect(() => {
    if (docs) setContent(current?.content ?? IDENTITY_TEMPLATES[type]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, type]);

  const save = useMutation({
    mutationFn: () => api.saveAgentIdentity(agentId, type, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-identity", agentId] });
      qc.invalidateQueries({ queryKey: ["agent-identity-versions", agentId, type] });
    },
  });

  const restore = useMutation({
    mutationFn: (version: number) => api.restoreAgentIdentityVersion(agentId, type, version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-identity", agentId] });
      qc.invalidateQueries({ queryKey: ["agent-identity-versions", agentId, type] });
    },
  });

  if (isLoading) return <Loading />;

  const overLimit = content.length > IDENTITY_MAX_CHARS;
  const dirty = content !== (current?.content ?? IDENTITY_TEMPLATES[type]);

  return (
    <div className="space-y-4">
      <Tabs
        value={type}
        onChange={(k) => {
          setType(k as IdentityType);
          setShowHistory(false);
        }}
        items={IDENTITY_TYPES.map((t) => ({
          key: t,
          label: (
            <>
              {LABELS[t]}
              {docs?.[t] && (
                <span className="ml-1 font-mono text-[11px] text-fg3">v{docs[t]!.version}</span>
              )}
            </>
          ),
        }))}
        end={
          <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "Ocultar historial" : "Historial"}
          </Button>
        }
      />

      {showHistory && (
        <Card className="p-4">
          <ul className="space-y-1.5">
            {versions?.length === 0 && (
              <li className="text-sm text-fg3">Sin versiones guardadas.</li>
            )}
            {versions?.map((v) => (
              <li key={v.version} className="flex items-center justify-between text-sm text-fg2">
                <span>
                  <span className="font-mono text-fg">v{v.version}</span> ·{" "}
                  {new Date(v.createdAt).toLocaleString()} · {v.createdBy}
                </span>
                {isAdmin && v.version !== current?.version && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restore.mutate(v.version)}
                    disabled={restore.isPending}
                  >
                    Restaurar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        readOnly={!isAdmin}
        rows={18}
        className="font-mono text-sm"
      />

      <div className="flex items-center justify-between">
        <span className={cn("font-mono text-xs", overLimit ? "text-danger" : "text-fg3")}>
          {content.length.toLocaleString()} / {IDENTITY_MAX_CHARS.toLocaleString()} caracteres
        </span>
        {isAdmin && (
          <Button onClick={() => save.mutate()} disabled={save.isPending || overLimit || !dirty}>
            {save.isPending ? "Guardando…" : "Guardar nueva versión"}
          </Button>
        )}
      </div>

      {(save.error || restore.error) && (
        <ErrorText>{((save.error ?? restore.error) as Error).message}</ErrorText>
      )}
    </div>
  );
}
