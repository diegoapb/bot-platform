import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { CURRENCIES, type CatalogItem, type CatalogItemInput, type ImportReport } from "@bot/shared";
import { useApi } from "@/lib/useApi";

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Disponible",
  unavailable: "No disponible",
  on_request: "Bajo pedido",
};

const EMPTY: CatalogItemInput = {
  name: "",
  description: null,
  price: "",
  currency: "COP",
  availability: "available",
  attributes: {},
};

/** Catálogo de productos/servicios del bot (US-010). */
export function CatalogManager({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const csvInput = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [availability, setAvailability] = useState("");
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);
  const [draft, setDraft] = useState<CatalogItemInput>(EMPTY);
  const [attrsText, setAttrsText] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  const { data: items } = useQuery({
    queryKey: ["catalog", botId, q, availability],
    queryFn: () => api.listCatalog(botId, { q: q || undefined, availability: availability || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["catalog", botId] });

  const save = useMutation({
    mutationFn: () => {
      let attributes: Record<string, string> = {};
      if (attrsText.trim()) attributes = JSON.parse(attrsText);
      const payload = { ...draft, attributes };
      return editing === "new"
        ? api.createCatalogItem(botId, payload)
        : api.updateCatalogItem(botId, (editing as CatalogItem).id, payload);
    },
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  const archive = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      api.archiveCatalogItem(botId, id, archived),
    onSuccess: invalidate,
  });

  const importCsv = useMutation({
    mutationFn: (file: File) => api.importCatalogCsv(botId, file),
    onSuccess: (r) => {
      setReport(r);
      invalidate();
    },
  });

  const openEditor = (item: CatalogItem | "new") => {
    setEditing(item);
    if (item === "new") {
      setDraft(EMPTY);
      setAttrsText("");
    } else {
      setDraft({
        name: item.name,
        description: item.description,
        price: item.price,
        currency: item.currency as CatalogItemInput["currency"],
        availability: item.availability,
        attributes: item.attributes,
      });
      setAttrsText(Object.keys(item.attributes).length ? JSON.stringify(item.attributes, null, 2) : "");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por texto…"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Toda disponibilidad</option>
          {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <button onClick={() => csvInput.current?.click()} className="rounded-md border px-3 py-2 text-sm">
              Importar CSV
            </button>
            <input
              ref={csvInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv.mutate(e.target.files[0])}
            />
            <button
              onClick={() => openEditor("new")}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              + Ítem
            </button>
          </div>
        )}
      </div>

      {importCsv.error && <p className="text-sm text-red-600">{(importCsv.error as Error).message}</p>}
      {report && (
        <div className="rounded-lg border p-3 text-sm">
          <p>
            Import: <span className="font-medium text-green-700">{report.created} creadas</span>
            {report.rejected.length > 0 && (
              <span className="text-red-600"> · {report.rejected.length} rechazadas</span>
            )}
          </p>
          {report.rejected.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-red-600">
              {report.rejected.map((r) => (
                <li key={r.row}>
                  Fila {r.row}: {r.reason}
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setReport(null)} className="mt-2 text-xs underline">
            Cerrar
          </button>
        </div>
      )}

      {editing && (
        <div className="space-y-2 rounded-lg border p-4">
          <h3 className="font-medium">{editing === "new" ? "Nuevo ítem" : "Editar ítem"}</h3>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nombre"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
            placeholder="Descripción"
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="Precio (ej. 25000.00)"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value as CatalogItemInput["currency"] })}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={draft.availability}
              onChange={(e) =>
                setDraft({ ...draft, availability: e.target.value as CatalogItemInput["availability"] })
              }
              className="rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={attrsText}
            onChange={(e) => setAttrsText(e.target.value)}
            placeholder='Atributos JSON, ej. {"talla": "M", "color": "azul"}'
            rows={2}
            className="w-full rounded-md border px-3 py-2 font-mono text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={!draft.name || !draft.price || save.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              Guardar
            </button>
            <button onClick={() => setEditing(null)} className="rounded-md border px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
          {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Disponibilidad</th>
              <th className="p-3">Estado</th>
              {isAdmin && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => (
              <tr key={item.id} className={`border-t ${item.archivedAt ? "opacity-50" : ""}`}>
                <td className="p-3">
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="max-w-md truncate text-xs text-muted-foreground">{item.description}</p>
                  )}
                </td>
                {/* price es string decimal — se muestra tal cual, sin redondeos. */}
                <td className="p-3 font-mono">
                  {item.price} {item.currency}
                </td>
                <td className="p-3">{AVAILABILITY_LABEL[item.availability]}</td>
                <td className="p-3 text-xs">{item.archivedAt ? "Archivado" : "Activo"}</td>
                {isAdmin && (
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditor(item)} className="rounded-md border px-2 py-1 text-xs">
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (
                            item.archivedAt ||
                            confirm(`¿Archivar "${item.name}"? El bot dejará de ofrecerlo.`)
                          ) {
                            archive.mutate({ id: item.id, archived: !item.archivedAt });
                          }
                        }}
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        {item.archivedAt ? "Restaurar" : "Archivar"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {items?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  El catálogo está vacío.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
