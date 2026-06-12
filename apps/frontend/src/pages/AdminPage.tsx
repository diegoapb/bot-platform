import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Input,
  Loading,
  PageHeader,
} from "@/components/ui";

export function AdminPage() {
  const api = useApi();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: () => api.listTenants(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "tenants"] });

  const createTenant = useMutation({
    mutationFn: () => api.createTenant({ name }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
  });
  const block = useMutation({
    mutationFn: (id: string) => api.blockTenant(id),
    onSuccess: invalidate,
  });
  const unblock = useMutation({
    mutationFn: (id: string) => api.unblockTenant(id),
    onSuccess: invalidate,
  });

  return (
    <section>
      <PageHeader
        eyebrow="Plataforma"
        eyebrowNum="00"
        title="Tenants"
        description="Vista de super admin: todas las organizaciones, su actividad y estado."
      />

      <form
        className="mb-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createTenant.mutate();
        }}
      >
        <Input
          className="flex-1"
          placeholder="Nombre del nuevo tenant"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={createTenant.isPending || !name.trim()}>
          {createTenant.isPending ? "Creando…" : "Crear tenant"}
        </Button>
      </form>

      {createTenant.error && (
        <ErrorText className="mb-4">{(createTenant.error as Error).message}</ErrorText>
      )}
      {isLoading && <Loading />}
      {error && <ErrorText>Error: {(error as Error).message}</ErrorText>}

      {tenants && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-soft text-left font-mono text-[11px] uppercase tracking-wide text-fg3">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Miembros</th>
                <th className="px-4 py-3 font-medium">Bots</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium text-fg">{t.name}</div>
                    <div className="font-mono text-xs text-fg3">{t.slug ?? t.id}</div>
                  </td>
                  <td className="px-4 py-3 text-fg2">{t.membersCount}</td>
                  <td className="px-4 py-3 text-fg2">{t.botsCount}</td>
                  <td className="px-4 py-3">
                    {t.blocked ? (
                      <Badge tone="danger" dot>
                        Bloqueado
                      </Badge>
                    ) : (
                      <Badge tone="ok" dot>
                        Activo
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.blocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unblock.mutate(t.id)}
                        disabled={unblock.isPending}
                      >
                        Desbloquear
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => block.mutate(t.id)}
                        disabled={block.isPending}
                      >
                        Bloquear
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-fg3">
                    No hay tenants todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
