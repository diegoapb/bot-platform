import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { IDENTITY_TYPES, IDENTITY_TEMPLATES, IDENTITY_MAX_CHARS } from "@bot/shared";
import type { IdentityType } from "@bot/shared";
import { useApi } from "@/lib/useApi";

const LABELS: Record<IdentityType, string> = {
  SOUL: "SOUL.md",
  IDENTITY: "IDENTITY.md",
  GUARDRAILS: "GUARDRAILS.md",
};

/** Editor de documentos de identidad del bot con historial y restore. */
export function IdentityEditor({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [type, setType] = useState<IdentityType>("SOUL");
  const [content, setContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["identity", botId],
    queryFn: () => api.getIdentity(botId),
  });

  const { data: versions } = useQuery({
    queryKey: ["identity-versions", botId, type],
    queryFn: () => api.listIdentityVersions(botId, type),
    enabled: showHistory,
  });

  const current = docs?.[type] ?? null;

  // Al cambiar de tab o llegar datos: contenido vigente o plantilla inicial.
  useEffect(() => {
    if (docs) setContent(current?.content ?? IDENTITY_TEMPLATES[type]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, type]);

  const save = useMutation({
    mutationFn: () => api.saveIdentity(botId, type, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["identity", botId] });
      qc.invalidateQueries({ queryKey: ["identity-versions", botId, type] });
    },
  });

  const restore = useMutation({
    mutationFn: (version: number) => api.restoreIdentityVersion(botId, type, version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["identity", botId] });
      qc.invalidateQueries({ queryKey: ["identity-versions", botId, type] });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Cargando…</p>;

  const overLimit = content.length > IDENTITY_MAX_CHARS;
  const dirty = content !== (current?.content ?? IDENTITY_TEMPLATES[type]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b">
        {IDENTITY_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setShowHistory(false);
            }}
            className={`px-3 py-2 text-sm ${
              type === t ? "border-b-2 border-primary font-medium" : "text-muted-foreground"
            }`}
          >
            {LABELS[t]}
            {docs?.[t] && <span className="ml-1 text-xs">v{docs[t]!.version}</span>}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="px-3 py-2 text-sm text-muted-foreground"
        >
          {showHistory ? "Ocultar historial" : "Historial"}
        </button>
      </div>

      {showHistory && (
        <ul className="space-y-1 rounded-lg border p-3">
          {versions?.length === 0 && (
            <li className="text-sm text-muted-foreground">Sin versiones guardadas.</li>
          )}
          {versions?.map((v) => (
            <li key={v.version} className="flex items-center justify-between text-sm">
              <span>
                v{v.version} · {new Date(v.createdAt).toLocaleString()} · {v.createdBy}
              </span>
              {isAdmin && v.version !== current?.version && (
                <button
                  onClick={() => restore.mutate(v.version)}
                  disabled={restore.isPending}
                  className="rounded border px-2 py-0.5 text-xs disabled:opacity-50"
                >
                  Restaurar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        readOnly={!isAdmin}
        rows={18}
        className="w-full rounded-lg border p-3 font-mono text-sm"
      />

      <div className="flex items-center justify-between">
        <span className={`text-xs ${overLimit ? "text-red-600" : "text-muted-foreground"}`}>
          {content.length.toLocaleString()} / {IDENTITY_MAX_CHARS.toLocaleString()} caracteres
        </span>
        {isAdmin && (
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || overLimit || !dirty}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {save.isPending ? "Guardando…" : "Guardar nueva versión"}
          </button>
        )}
      </div>

      {(save.error || restore.error) && (
        <p className="text-sm text-red-600">
          {((save.error ?? restore.error) as Error).message}
        </p>
      )}
    </div>
  );
}
