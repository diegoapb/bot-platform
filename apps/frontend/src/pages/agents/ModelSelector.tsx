import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { Button, Card, CardBody, CardHeader, CardTitle, ErrorText, Field, Input, Select } from "@/components/ui";

interface ModelSelectorProps {
  agentId: string;
  model: string | null; // null = global por defecto
  isAdmin: boolean;
}

/** Selección del modelo LLM del agente: global por defecto o uno concreto (US-034 R3.4, R3.5). */
export function ModelSelector({ agentId, model, isAdmin }: ModelSelectorProps) {
  const api = useApi();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"global" | "custom">(model ? "custom" : "global");
  const [value, setValue] = useState(model ?? "");

  const save = useMutation({
    mutationFn: () =>
      api.updateAgent(agentId, { model: mode === "global" ? null : value.trim() }),
    onSuccess: (updated) => {
      qc.setQueryData(["agent", agentId], updated);
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const effective = mode === "global" ? null : value.trim();
  const dirty = effective !== model;
  const invalid = mode === "custom" && value.trim() === "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelo del agente</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <Field label="Modelo LLM">
          <Select
            value={mode}
            disabled={!isAdmin}
            onChange={(e) => setMode(e.target.value as "global" | "custom")}
          >
            <option value="global">Global por defecto (modelo de la plataforma)</option>
            <option value="custom">Modelo concreto</option>
          </Select>
        </Field>

        {mode === "global" && (
          <p className="text-sm text-fg3">
            Este agente usa el modelo global de la plataforma.
          </p>
        )}

        {mode === "custom" && (
          <Field label="Identificador del modelo">
            <Input
              value={value}
              disabled={!isAdmin}
              onChange={(e) => setValue(e.target.value)}
              placeholder="claude-haiku-4-5-20251001"
            />
          </Field>
        )}

        {isAdmin && (
          <div className="flex items-center gap-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty || invalid}>
              {save.isPending ? "Guardando…" : "Guardar modelo"}
            </Button>
            {save.isSuccess && !dirty && <span className="text-sm text-fg3">Guardado.</span>}
          </div>
        )}

        {save.error && <ErrorText>{(save.error as Error).message}</ErrorText>}
      </CardBody>
    </Card>
  );
}
