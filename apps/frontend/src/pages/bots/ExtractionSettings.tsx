import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  EXTRACTION_SCHEMA_EXAMPLE,
  validateExtractionSchema,
  type ExtractionField,
} from "@bot/shared";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorText,
  Loading,
  Textarea,
} from "@/components/ui";

/**
 * Esquema de extracción del bot (E12/US-027): qué información estructurada
 * capturar de las conversaciones. Se define como JSON (subset de JSON Schema)
 * y se previsualizan los campos de forma amigable.
 */
export function ExtractionSettings({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["extraction-schema", botId],
    queryFn: () => api.getExtractionSchema(botId),
  });

  useEffect(() => {
    if (data) setText(data.schema ? JSON.stringify(data.schema, null, 2) : "");
  }, [data]);

  const save = useMutation({
    mutationFn: (schema: Record<string, unknown> | null) =>
      api.saveExtractionSchema(botId, schema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extraction-schema", botId] });
      qc.invalidateQueries({ queryKey: ["bot", botId] });
    },
  });

  if (isLoading) return <Loading />;

  // Validación en vivo del JSON del editor (mismas reglas que el backend).
  let parsed: Record<string, unknown> | null = null;
  let parseError: string | null = null;
  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parseError = "JSON inválido";
    }
  }
  const schemaErrors = parsed ? validateExtractionSchema(parsed) : [];
  const fields =
    parsed && schemaErrors.length === 0
      ? Object.entries((parsed.properties ?? {}) as Record<string, ExtractionField>)
      : [];
  const required = new Set(((parsed?.required as string[]) ?? []) as string[]);

  const onSave = () => {
    setErrors([]);
    if (!text.trim()) {
      if (confirm("¿Desactivar la extracción de este bot? Los datos ya extraídos se conservan.")) {
        save.mutate(null);
      }
      return;
    }
    if (parseError) return setErrors([parseError]);
    const errs = validateExtractionSchema(parsed);
    if (errs.length > 0) return setErrors(errs);
    save.mutate(parsed);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Esquema de extracción (JSON)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-fg3">
            Define los campos que el bot debe capturar de cada conversación. Tipos soportados:
            string, number, boolean, array (de strings) y enum.
          </p>
          <Textarea
            rows={18}
            className="font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{ "type": "object", "properties": { … } }'
            readOnly={!isAdmin}
          />
          {(parseError || schemaErrors.length > 0) && text.trim() !== "" && (
            <ul className="space-y-0.5">
              {[parseError, ...schemaErrors].filter(Boolean).map((e) => (
                <li key={e}>
                  <ErrorText>{e}</ErrorText>
                </li>
              ))}
            </ul>
          )}
          {errors.map((e) => (
            <ErrorText key={e}>{e}</ErrorText>
          ))}
          {save.isError && <ErrorText>{(save.error as Error).message}</ErrorText>}
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="accent" onClick={onSave} disabled={save.isPending}>
                {save.isPending ? "Guardando…" : "Guardar esquema"}
              </Button>
              {!text.trim() && (
                <Button
                  variant="outline"
                  onClick={() => setText(JSON.stringify(EXTRACTION_SCHEMA_EXAMPLE, null, 2))}
                >
                  Usar ejemplo
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <div>
        <h3 className="mb-3 font-display text-lg text-fg">Campos a extraer</h3>
        {fields.length === 0 ? (
          <p className="text-sm text-fg3">
            {text.trim()
              ? "Corrige el esquema para previsualizar los campos."
              : "Sin esquema: la extracción está desactivada para este bot."}
          </p>
        ) : (
          <ul className="space-y-2">
            {fields.map(([key, field]) => (
              <li
                key={key}
                className="rounded-sm border border-line bg-surface px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-fg">{key}</span>
                  <Badge tone="neutral" mono>
                    {field.enum ? `enum(${field.enum.length})` : field.type}
                  </Badge>
                  {required.has(key) && <Badge tone="info">requerido</Badge>}
                </div>
                {field.description && <p className="mt-0.5 text-xs text-fg3">{field.description}</p>}
                {field.enum && (
                  <p className="mt-0.5 font-mono text-xs text-fg3">{field.enum.join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
