import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";

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
        <h3 className="mb-2 font-medium">Contactos ({contacts?.length ?? 0})</h3>
        <ul className="space-y-2">
          {contacts?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay contactos.</p>
          )}
          {contacts?.map((c) => (
            <li key={c.channelLinkId}>
              <button
                onClick={() => setSelected(c.channelLinkId)}
                className={`w-full rounded-lg border p-3 text-left text-sm ${
                  selected === c.channelLinkId ? "border-primary bg-primary/5" : ""
                }`}
              >
                <p className="font-medium">{c.phoneE164}</p>
                <p className="text-xs text-muted-foreground">
                  {c.factsCount} hechos · {c.hasSummary ? "con resumen" : "sin resumen"}
                  {c.memoryUpdatedAt && ` · ${new Date(c.memoryUpdatedAt).toLocaleDateString()}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {!selected && <p className="text-sm text-muted-foreground">Selecciona un contacto.</p>}
        {selected && memory && (
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-medium">Hechos</h3>
              <ul className="space-y-1">
                {memory.facts.length === 0 && (
                  <p className="text-sm text-muted-foreground">El bot aún no sabe nada de este cliente.</p>
                )}
                {memory.facts.map((f) => (
                  <li key={f.key} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium">{f.key}</span>: {f.value}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({f.origin === "human" ? "editado" : "aprendido"})
                      </span>
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => removeFact.mutate(f.key)}
                        className="text-xs text-red-600 underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="clave (ej. nombre)"
                    className="w-1/3 rounded-md border px-2 py-1.5 text-sm"
                  />
                  <input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="valor"
                    className="flex-1 rounded-md border px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => upsert.mutate()}
                    disabled={!newKey || !newValue || upsert.isPending}
                    className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-1 font-medium">Resumen</h3>
              <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {memory.summary ?? "Sin resumen todavía (se genera al consolidar conversaciones)."}
              </p>
              {memory.updatedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Actualizado: {new Date(memory.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  if (
                    confirm("¿Borrar TODA la memoria de este contacto?") &&
                    confirm("Esta acción es irreversible. ¿Confirmas el borrado definitivo?")
                  ) {
                    wipeMemory.mutate();
                  }
                }}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600"
              >
                Borrar memoria completa
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
