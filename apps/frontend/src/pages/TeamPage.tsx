import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/useApi";
import type { BotAssignment } from "@bot/shared";

export function TeamPage() {
  const api = useApi();
  const qc = useQueryClient();

  const [membersQ, botsQ, assignmentsQ] = useQueries({
    queries: [
      { queryKey: ["members"], queryFn: () => api.listMembers() },
      { queryKey: ["bots"], queryFn: () => api.listBots() },
      { queryKey: ["assignments"], queryFn: () => api.listAssignments() },
    ],
  });

  const assign = useMutation({
    mutationFn: (vars: { botId: string; userId: string }) => api.createAssignment(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
  const unassign = useMutation({
    mutationFn: (id: string) => api.deleteAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const members = membersQ.data ?? [];
  const bots = botsQ.data ?? [];
  const assignments: BotAssignment[] = assignmentsQ.data ?? [];

  const findAssignment = (botId: string, userId: string) =>
    assignments.find((a) => a.botId === botId && a.userId === userId);

  const toggle = (botId: string, userId: string) => {
    const existing = findAssignment(botId, userId);
    if (existing) unassign.mutate(existing.id);
    else assign.mutate({ botId, userId });
  };

  const loading = membersQ.isLoading || botsQ.isLoading || assignmentsQ.isLoading;

  return (
    <section>
      <header className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Equipo</h1>
      </header>
      <p className="mb-6 text-sm text-muted-foreground">
        Asigna a cada usuario los bots que puede gestionar. Para invitar o quitar usuarios usa{" "}
        <span className="font-medium">“Manage organization”</span> en el selector de tenant.
        Los administradores tienen acceso a todos los bots.
      </p>

      {loading && <p className="text-muted-foreground">Cargando…</p>}

      {!loading && (
        <div className="space-y-4">
          {members.map((m) => (
            <div key={m.userId} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">
                  {m.role === "org:admin" ? "admin" : "miembro"}
                </span>
              </div>

              {m.role === "org:admin" ? (
                <p className="text-sm text-muted-foreground">Acceso a todos los bots del tenant.</p>
              ) : bots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay bots para asignar.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bots.map((bot) => {
                    const active = !!findAssignment(bot.id, m.userId);
                    return (
                      <button
                        key={bot.id}
                        onClick={() => toggle(bot.id, m.userId)}
                        className={
                          "rounded-full border px-3 py-1 text-xs transition-colors " +
                          (active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-muted")
                        }
                      >
                        {active ? "✓ " : ""}
                        {bot.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Aún no hay miembros en el tenant.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
