import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  validateDataAgainstSchema,
  validateExtractionSchema,
  type ExtractionField,
  type ExtractionSchema,
} from "@bot/shared";
import { useApi } from "@/lib/useApi";
import { Badge, Button, ErrorText, Textarea } from "@/components/ui";

/**
 * Datos estructurados extraídos de un contacto (E12/US-029): render amigable
 * por campo del esquema + edición del JSON subyacente con validación. Las
 * claves editadas a mano quedan marcadas y la extracción automática no las pisa.
 */
export function ExtractionDataCard({ linkId, isAdmin }: { linkId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const { data } = useQuery({
    queryKey: ["extraction", linkId],
    queryFn: () => api.getContactExtraction(linkId),
  });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.updateContactExtraction(linkId, payload),
    onSuccess: () => {
      setEditing(false);
      setErrors([]);
      qc.invalidateQueries({ queryKey: ["extraction", linkId] });
    },
  });

  if (!data) return null;
  const schemaValid =
    data.schema != null && validateExtractionSchema(data.schema).length === 0;
  if (!schemaValid) {
    return (
      <div>
        <h3 className="mb-2 font-display text-lg text-fg">Datos estructurados</h3>
        <p className="text-sm text-fg3">
          Este bot no tiene esquema de extracción configurado (pestaña Extracción).
        </p>
      </div>
    );
  }

  const schema = data.schema as unknown as ExtractionSchema;
  const fields = Object.entries(schema.properties) as Array<[string, ExtractionField]>;

  const render = (value: unknown): string => {
    if (value === undefined || value === null) return "—";
    if (Array.isArray(value)) return value.join(", ") || "—";
    if (typeof value === "boolean") return value ? "sí" : "no";
    return String(value);
  };

  const startEdit = () => {
    setText(JSON.stringify(data.data, null, 2));
    setErrors([]);
    setEditing(true);
  };

  const onSave = () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return setErrors(["JSON inválido"]);
    }
    const errs = validateDataAgainstSchema(schema, parsed);
    if (errs.length > 0) return setErrors(errs);
    save.mutate(parsed);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-lg text-fg">Datos estructurados</h3>
        {isAdmin && !editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            Editar JSON
          </Button>
        )}
      </div>

      {!editing && (
        <>
          <ul className="space-y-1.5">
            {fields.map(([key, field]) => (
              <li
                key={key}
                className="flex items-start justify-between gap-3 rounded-sm border border-line bg-surface px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-fg">{key}</p>
                  {field.description && <p className="text-xs text-fg3">{field.description}</p>}
                </div>
                <div className="flex items-center gap-1.5 text-right">
                  <span className="text-fg2">{render(data.data[key])}</span>
                  {data.manualKeys.includes(key) && <Badge tone="info">manual</Badge>}
                </div>
              </li>
            ))}
          </ul>
          {data.updatedAt && (
            <p className="mt-1 text-xs text-fg3">
              Actualizado: {new Date(data.updatedAt).toLocaleString()}
            </p>
          )}
        </>
      )}

      {editing && (
        <div className="space-y-2">
          <Textarea
            rows={10}
            className="font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {errors.map((e) => (
            <ErrorText key={e}>{e}</ErrorText>
          ))}
          {save.isError && <ErrorText>{(save.error as Error).message}</ErrorText>}
          <div className="flex gap-2">
            <Button variant="accent" size="sm" onClick={onSave} disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
