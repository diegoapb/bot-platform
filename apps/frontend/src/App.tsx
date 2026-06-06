import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createApi } from "@/lib/api";

function Dashboard() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApi(getToken), [getToken]);

  const { data: bots, isLoading, error } = useQuery({
    queryKey: ["bots"],
    queryFn: () => api.listBots(),
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis bots</h1>
        <UserButton />
      </header>

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
            Aún no tienes bots. Crea el primero.
          </li>
        )}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <main>
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-3xl font-bold">bot-plataform</h1>
          <p className="text-muted-foreground">Inicia sesión para gestionar tus bots.</p>
          <SignInButton mode="modal">
            <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Iniciar sesión
            </button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </main>
  );
}
