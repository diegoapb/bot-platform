import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { PhoneRule, PhoneRuleKind } from "@bot/shared";
import { useApi } from "@/lib/useApi";

/**
 * Lista blanca / negra de teléfonos del bot. Bloqueado = el bot ignora por
 * completo los mensajes de ese número. La lista blanca solo aplica con el
 * switch activado: entonces el bot únicamente atiende a los números `allow`.
 */
export function AudienceSettings({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();

  const { data: bot } = useQuery({ queryKey: ["bot", botId], queryFn: () => api.getBot(botId) });
  const { data: rules, isLoading } = useQuery({
    queryKey: ["phone-rules", botId],
    queryFn: () => api.listPhoneRules(botId),
  });

  const [phone, setPhone] = useState("");
  const [kind, setKind] = useState<PhoneRuleKind>("block");
  const [note, setNote] = useState("");

  const toggleWhitelist = useMutation({
    mutationFn: (enabled: boolean) => api.updateBot(botId, { whitelistEnabled: enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot", botId] }),
  });

  const addRule = useMutation({
    mutationFn: () => api.addPhoneRule(botId, { phone, kind, note: note || undefined }),
    onSuccess: () => {
      setPhone("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["phone-rules", botId] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) => api.deletePhoneRule(botId, ruleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["phone-rules", botId] }),
  });

  if (isLoading) return <p className="text-muted-foreground">Cargando…</p>;

  const allow = (rules ?? []).filter((r) => r.kind === "allow");
  const block = (rules ?? []).filter((r) => r.kind === "block");
  const whitelistEnabled = !!bot?.whitelistEnabled;

  return (
    <div className="space-y-6">
      {/* Switch de modo lista blanca */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Modo lista blanca</p>
          <p className="text-sm text-muted-foreground">
            {whitelistEnabled
              ? "El bot solo atiende a los números de la lista blanca."
              : "El bot atiende a todos, salvo los de la lista negra."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => toggleWhitelist.mutate(!whitelistEnabled)}
            disabled={toggleWhitelist.isPending}
            className={`rounded-md px-4 py-2 text-sm disabled:opacity-50 ${
              whitelistEnabled
                ? "bg-primary text-primary-foreground"
                : "border"
            }`}
          >
            {whitelistEnabled ? "Activada" : "Desactivada"}
          </button>
        )}
      </div>

      {/* Alta de regla */}
      {isAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (phone.trim()) addRule.mutate();
          }}
          className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
        >
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Teléfono</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 9 11 5555 5555"
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Lista</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as PhoneRuleKind)}
              className="rounded-md border px-3 py-2"
            >
              <option value="block">Negra (no responder)</option>
              <option value="allow">Blanca (responder)</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Nota (opcional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Motivo o referencia"
              className="rounded-md border px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={addRule.isPending || !phone.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {addRule.isPending ? "Agregando…" : "Agregar"}
          </button>
          {addRule.error && (
            <p className="w-full text-sm text-red-600">{(addRule.error as Error).message}</p>
          )}
        </form>
      )}

      <RuleList
        title="Lista blanca"
        empty="Sin números en la lista blanca."
        rules={allow}
        isAdmin={isAdmin}
        onDelete={(id) => deleteRule.mutate(id)}
      />
      <RuleList
        title="Lista negra"
        empty="Sin números bloqueados."
        rules={block}
        isAdmin={isAdmin}
        onDelete={(id) => deleteRule.mutate(id)}
      />
    </div>
  );
}

function RuleList({
  title,
  empty,
  rules,
  isAdmin,
  onDelete,
}: {
  title: string;
  empty: string;
  rules: PhoneRule[];
  isAdmin: boolean;
  onDelete: (ruleId: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 font-medium">
        {title} <span className="text-sm text-muted-foreground">({rules.length})</span>
      </h3>
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{r.phoneE164}</p>
                {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
              </div>
              {isAdmin && (
                <button
                  onClick={() => onDelete(r.id)}
                  className="rounded-md border px-3 py-1.5 text-xs text-red-600"
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
