import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Library } from "lucide-react";
import type { KnowledgeCollection } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import { Badge, Button, Card, EmptyState, ErrorText, Input, Loading } from "@/components/ui";

/** Enlace de colecciones + conocimiento efectivo del agente (US-034 R5). */
export function AgentKnowledgePanel({ agentId, isAdmin }: { agentId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-collections", agentId],
    queryFn: () => api.listAgentCollections(agentId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["agent-collections", agentId] });

  const link = useMutation({
    mutationFn: (collectionId: string) => api.linkCollection(agentId, collectionId),
    onSuccess: invalidate,
  });
  const unlink = useMutation({
    mutationFn: (collectionId: string) => api.unlinkCollection(agentId, collectionId),
    onSuccess: invalidate,
  });
  const create = useMutation({
    mutationFn: () => api.createCollection({ name: newName.trim() }),
    onSuccess: () => {
      setNewName("");
      invalidate();
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorText>Error: {(error as Error).message}</ErrorText>;

  const linked = data?.linked ?? [];
  const available = data?.available ?? [];

  const row = (coll: KnowledgeCollection, action: React.ReactNode) => (
    <li key={coll.id}>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-fg">{coll.name}</p>
            {coll.description && <p className="text-xs text-fg3">{coll.description}</p>}
            <p className="mt-0.5 font-mono text-[11px] text-fg3">
              {coll.sourceCount ?? 0} fuente(s)
            </p>
          </div>
          {action}
        </div>
      </Card>
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-display text-lg text-fg">Conocimiento efectivo ({linked.length})</h3>
            <Badge tone="ok" mono>
              enlazadas
            </Badge>
          </div>
          <ul className="space-y-2">
            {linked.map((coll) =>
              row(
                coll,
                isAdmin ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={unlink.isPending}
                    onClick={() => unlink.mutate(coll.id)}
                  >
                    Desenlazar
                  </Button>
                ) : null,
              ),
            )}
          </ul>
          {linked.length === 0 && (
            <EmptyState
              icon={<Library className="h-7 w-7" />}
              title="Sin conocimiento efectivo"
              description="Este agente no tiene colecciones enlazadas; no usará conocimiento al responder."
            />
          )}
          {unlink.isError && (
            <ErrorText className="mt-2">{(unlink.error as Error).message}</ErrorText>
          )}
        </div>

        {isAdmin && (
          <div>
            <h3 className="mb-3 font-display text-lg text-fg">Disponibles ({available.length})</h3>
            <ul className="space-y-2">
              {available.map((coll) =>
                row(
                  coll,
                  <Button
                    variant="accent"
                    size="sm"
                    disabled={link.isPending}
                    onClick={() => link.mutate(coll.id)}
                  >
                    Enlazar
                  </Button>,
                ),
              )}
            </ul>
            {available.length === 0 && (
              <p className="text-sm text-fg3">No hay más colecciones para enlazar.</p>
            )}
            {link.isError && <ErrorText className="mt-2">{(link.error as Error).message}</ErrorText>}
          </div>
        )}
      </div>

      {isAdmin && (
        <Card className="p-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) create.mutate();
            }}
          >
            <Input
              className="flex-1"
              placeholder="Nombre de una nueva colección"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={create.isPending || !newName.trim()}>
              {create.isPending ? "Creando…" : "Crear colección"}
            </Button>
          </form>
          {create.isError && <ErrorText className="mt-2">{(create.error as Error).message}</ErrorText>}
        </Card>
      )}
    </div>
  );
}
