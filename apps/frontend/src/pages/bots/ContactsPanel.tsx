import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { Badge, Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ExtractionDataCard } from "./ExtractionDataCard";

/** Contactos del bot y su memoria: hechos editables + resumen (US-013). */
export function ContactsPanel({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const { data: contacts } = useQuery({
    queryKey: ["contacts", botId],
    queryFn: () => api.listContacts(botId),
  });

  const { data: memory } = useQuery({
    queryKey: ["memory", selected],
    queryFn: () => api.getContactMemory(selected!),
    enabled: !!selected,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["memory", selected] });
    qc.invalidateQueries({ queryKey: ["contacts", botId] });
  };

  const upsert = useMutation({
    mutationFn: () => api.upsertContactFact(selected!, newKey, newValue),
    onSuccess: () => {
      setNewKey("");
      setNewValue("");
      invalidate();
    },
  });
  const removeFact = useMutation({
    mutationFn: (key: string) => api.deleteContactFact(selected!, key),
    onSuccess: invalidate,
  });
  const wipeMemory = useMutation({
    mutationFn: () => api.wipeContactMemory(selected!),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h3 className="mb-3 font-display text-lg text-fg">Contactos ({contacts?.length ?? 0})</h3>
        <ul className="space-y-2">
          {contacts?.length === 0 && <p className="text-sm text-fg3">Aún no hay contactos.</p>}
          {contacts?.map((c) => (
            <li key={c.channelLinkId}>
              <button onClick={() => setSelected(c.channelLinkId)} className="block w-full text-left">
                <Card
                  interactive
                  className={cn(
                    "p-4",
                    selected === c.channelLinkId && "border-accent shadow-e1",
                  )}
                >
                  <p className="text-sm font-medium text-fg">{c.phoneE164}</p>
                  <p className="text-xs text-fg3">
                    {c.factsCount} hechos · {c.hasSummary ? "con resumen" : "sin resumen"}
                    {c.memoryUpdatedAt && ` · ${new Date(c.memoryUpdatedAt).toLocaleDateString()}`}
                  </p>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {!selected && <p className="text-sm text-fg3">Selecciona un contacto.</p>}
        {selected && memory && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 font-display text-lg text-fg">Hechos</h3>
              <ul className="space-y-1.5">
                {memory.facts.length === 0 && (
                  <p className="text-sm text-fg3">El bot aún no sabe nada de este cliente.</p>
                )}
                {memory.facts.map((f) => (
                  <li
                    key={f.key}
                    className="flex items-center justify-between rounded-sm border border-line bg-surface px-3 py-2 text-sm"
                  >
                    <span className="text-fg2">
                      <span className="font-medium text-fg">{f.key}</span>: {f.value}{" "}
                      <Badge tone="neutral" className="ml-1">
                        {f.origin === "human" ? "editado" : "aprendido"}
                      </Badge>
                    </span>
                    {isAdmin && (
                      <Button variant="danger" size="sm" onClick={() => removeFact.mutate(f.key)}>
                        Eliminar
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <div className="mt-3 flex gap-2">
                  <Input
                    className="w-1/3"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="clave (ej. nombre)"
                  />
                  <Input
                    className="flex-1"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="valor"
                  />
                  <Button
                    variant="outline"
                    onClick={() => upsert.mutate()}
                    disabled={!newKey || !newValue || upsert.isPending}
                  >
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 font-display text-lg text-fg">Resumen</h3>
              <p className="whitespace-pre-wrap rounded-sm border border-line bg-soft p-3 text-sm text-fg2">
                {memory.summary ?? "Sin resumen todavía (se genera al consolidar conversaciones)."}
              </p>
              {memory.updatedAt && (
                <p className="mt-1 text-xs text-fg3">
                  Actualizado: {new Date(memory.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <ExtractionDataCard linkId={selected} isAdmin={isAdmin} />

            {isAdmin && (
              <Button
                variant="danger"
                onClick={() => {
                  if (
                    confirm("¿Borrar TODA la memoria de este contacto?") &&
                    confirm("Esta acción es irreversible. ¿Confirmas el borrado definitivo?")
                  ) {
                    wipeMemory.mutate();
                  }
                }}
              >
                Borrar memoria completa
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
