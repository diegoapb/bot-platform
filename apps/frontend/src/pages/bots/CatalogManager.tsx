import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { CURRENCIES, type CatalogItem, type CatalogItemInput, type ImportReport } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";

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
    queryFn: () =>
      api.listCatalog(botId, { q: q || undefined, availability: availability || undefined }),
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
      setAttrsText(
        Object.keys(item.attributes).length ? JSON.stringify(item.attributes, null, 2) : "",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-56"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por texto…"
        />
        <Select
          className="w-48"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        >
          <option value="">Toda disponibilidad</option>
          {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => csvInput.current?.click()}>
              Importar CSV
            </Button>
            <input
              ref={csvInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv.mutate(e.target.files[0])}
            />
            <Button onClick={() => openEditor("new")}>+ Ítem</Button>
          </div>
        )}
      </div>

      {importCsv.error && <ErrorText>{(importCsv.error as Error).message}</ErrorText>}
      {report && (
        <Card className="p-4 text-sm">
          <p className="text-fg2">
            Import: <span className="font-medium text-ok">{report.created} creadas</span>
            {report.rejected.length > 0 && (
              <span className="text-danger"> · {report.rejected.length} rechazadas</span>
            )}
          </p>
          {report.rejected.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-danger">
              {report.rejected.map((r) => (
                <li key={r.row}>
                  Fila {r.row}: {r.reason}
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setReport(null)}>
            Cerrar
          </Button>
        </Card>
      )}

      {editing && (
        <Card className="space-y-3 p-5">
          <h3 className="font-display text-lg text-fg">
            {editing === "new" ? "Nuevo ítem" : "Editar ítem"}
          </h3>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nombre"
          />
          <Textarea
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
            placeholder="Descripción"
            rows={2}
          />
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="Precio (ej. 25000.00)"
            />
            <Select
              value={draft.currency}
              onChange={(e) =>
                setDraft({ ...draft, currency: e.target.value as CatalogItemInput["currency"] })
              }
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select
              value={draft.availability}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  availability: e.target.value as CatalogItemInput["availability"],
                })
              }
            >
              {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            className="font-mono text-xs"
            value={attrsText}
            onChange={(e) => setAttrsText(e.target.value)}
            placeholder='Atributos JSON, ej. {"talla": "M", "color": "azul"}'
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => save.mutate()}
              disabled={!draft.name || !draft.price || save.isPending}
            >
              Guardar
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
          {save.error && <ErrorText>{(save.error as Error).message}</ErrorText>}
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-soft text-left font-mono text-[11px] uppercase tracking-wide text-fg3">
            <tr>
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">Precio</th>
              <th className="p-3 font-medium">Disponibilidad</th>
              <th className="p-3 font-medium">Estado</th>
              {isAdmin && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => (
              <tr
                key={item.id}
                className={cn("border-t border-line", item.archivedAt && "opacity-50")}
              >
                <td className="p-3">
                  <p className="font-medium text-fg">{item.name}</p>
                  {item.description && (
                    <p className="max-w-md truncate text-xs text-fg3">{item.description}</p>
                  )}
                </td>
                <td className="p-3 font-mono text-fg2">
                  {item.price} {item.currency}
                </td>
                <td className="p-3 text-fg2">{AVAILABILITY_LABEL[item.availability]}</td>
                <td className="p-3">
                  <Badge tone={item.archivedAt ? "neutral" : "ok"}>
                    {item.archivedAt ? "Archivado" : "Activo"}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditor(item)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            item.archivedAt ||
                            confirm(`¿Archivar "${item.name}"? El bot dejará de ofrecerlo.`)
                          ) {
                            archive.mutate({ id: item.id, archived: !item.archivedAt });
                          }
                        }}
                      >
                        {item.archivedAt ? "Restaurar" : "Archivar"}
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {items?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-fg3">
                  El catálogo está vacío.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
