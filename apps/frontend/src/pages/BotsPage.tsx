import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/useApi";

export function BotsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";
  const [name, setName] = useState("");

  const { data: bots, isLoading, error } = useQuery({
    queryKey: ["bots"],
    queryFn: () => api.listBots(),
  });

  const createBot = useMutation({
    mutationFn: () => api.createBot({ name, channel: "whatsapp", evolutionInstance: null, chatwootInboxId: null }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  return (
    <section>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bots</h1>
      </header>

      {isAdmin && (
        <form
          className="mb-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createBot.mutate();
          }}
        >
          <input
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            placeholder="Nombre del nuevo bot"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            disabled={createBot.isPending || !name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {createBot.isPending ? "Creando…" : "Crear bot"}
          </button>
        </form>
      )}

      {createBot.error && (
        <p className="mb-4 text-sm text-red-600">{(createBot.error as Error).message}</p>
      )}
      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}

      <ul className="space-y-2">
        {bots?.map((bot) => (
          <li key={bot.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{bot.name}</span>
              <span className="text-xs uppercase text-muted-foreground">{bot.status}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {bot.channel} · instancia: {bot.evolutionInstance ?? "—"}
            </p>
          </li>
        ))}
        {bots?.length === 0 && (
          <li className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {isAdmin
              ? "Aún no hay bots en este tenant. Crea el primero."
              : "No tienes bots asignados todavía."}
          </li>
        )}
      </ul>
    </section>
  );
}
