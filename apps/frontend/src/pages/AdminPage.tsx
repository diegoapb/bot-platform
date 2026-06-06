import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";

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
      <header className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plataforma · Tenants</h1>
      </header>
      <p className="mb-6 text-sm text-muted-foreground">
        Vista de super admin: todas las organizaciones, su actividad y estado.
      </p>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createTenant.mutate();
        }}
      >
        <input
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          placeholder="Nombre del nuevo tenant"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={createTenant.isPending || !name.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {createTenant.isPending ? "Creando…" : "Crear tenant"}
        </button>
      </form>

      {createTenant.error && (
        <p className="mb-4 text-sm text-red-600">{(createTenant.error as Error).message}</p>
      )}
      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}

      {tenants && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Tenant</th>
                <th className="px-4 py-2">Miembros</th>
                <th className="px-4 py-2">Bots</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.slug ?? t.id}</div>
                  </td>
                  <td className="px-4 py-3">{t.membersCount}</td>
                  <td className="px-4 py-3">{t.botsCount}</td>
                  <td className="px-4 py-3">
                    {t.blocked ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Bloqueado
                      </span>
                    ) : (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.blocked ? (
                      <button
                        onClick={() => unblock.mutate(t.id)}
                        disabled={unblock.isPending}
                        className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
                      >
                        Desbloquear
                      </button>
                    ) : (
                      <button
                        onClick={() => block.mutate(t.id)}
                        disabled={block.isPending}
                        className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Bloquear
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No hay tenants todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
