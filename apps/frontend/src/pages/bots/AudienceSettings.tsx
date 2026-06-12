import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { PhoneRule, PhoneRuleKind } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import { Badge, Button, Card, ErrorText, Field, Input, Loading, Select } from "@/components/ui";

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

  if (isLoading) return <Loading />;

  const allow = (rules ?? []).filter((r) => r.kind === "allow");
  const block = (rules ?? []).filter((r) => r.kind === "block");
  const whitelistEnabled = !!bot?.whitelistEnabled;

  return (
    <div className="space-y-6">
      {/* Switch de modo lista blanca */}
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="font-medium text-fg">Modo lista blanca</p>
          <p className="mt-0.5 text-sm text-fg3">
            {whitelistEnabled
              ? "El bot solo atiende a los números de la lista blanca."
              : "El bot atiende a todos, salvo los de la lista negra."}
          </p>
        </div>
        {isAdmin && (
          <Button
            variant={whitelistEnabled ? "accent" : "outline"}
            onClick={() => toggleWhitelist.mutate(!whitelistEnabled)}
            disabled={toggleWhitelist.isPending}
          >
            {whitelistEnabled ? "Activada" : "Desactivada"}
          </Button>
        )}
      </Card>

      {/* Alta de regla */}
      {isAdmin && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (phone.trim()) addRule.mutate();
            }}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-5"
          >
            <Field label="Teléfono">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 11 5555 5555"
              />
            </Field>
            <Field label="Lista">
              <Select value={kind} onChange={(e) => setKind(e.target.value as PhoneRuleKind)}>
                <option value="block">Negra (no responder)</option>
                <option value="allow">Blanca (responder)</option>
              </Select>
            </Field>
            <Field label="Nota (opcional)" className="flex-1">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Motivo o referencia"
              />
            </Field>
            <Button type="submit" disabled={addRule.isPending || !phone.trim()}>
              {addRule.isPending ? "Agregando…" : "Agregar"}
            </Button>
            {addRule.error && (
              <ErrorText className="w-full">{(addRule.error as Error).message}</ErrorText>
            )}
          </form>
      )}

      <RuleList
        title="Lista blanca"
        tone="ok"
        empty="Sin números en la lista blanca."
        rules={allow}
        isAdmin={isAdmin}
        onDelete={(id) => deleteRule.mutate(id)}
      />
      <RuleList
        title="Lista negra"
        tone="danger"
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
  tone,
  empty,
  rules,
  isAdmin,
  onDelete,
}: {
  title: string;
  tone: "ok" | "danger";
  empty: string;
  rules: PhoneRule[];
  isAdmin: boolean;
  onDelete: (ruleId: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-fg">
        {title}
        <Badge tone={tone}>{rules.length}</Badge>
      </h3>
      {rules.length === 0 ? (
        <p className="text-sm text-fg3">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id}>
              <Card className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-fg">{r.phoneE164}</p>
                  {r.note && <p className="text-xs text-fg3">{r.note}</p>}
                </div>
                {isAdmin && (
                  <Button variant="danger" size="sm" onClick={() => onDelete(r.id)}>
                    Quitar
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
