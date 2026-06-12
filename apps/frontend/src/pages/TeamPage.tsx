import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useApi } from "@/lib/useApi";
import type { BotAssignment } from "@bot/shared";
import { Badge, Card, EmptyState, Loading, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

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
      <PageHeader
        eyebrow="Equipo"
        eyebrowNum="04"
        title="Equipo"
        description={
          <>
            Asigna a cada usuario los bots que puede gestionar. Para invitar o quitar
            usuarios usa <span className="font-medium text-fg">“Manage organization”</span> en
            el selector de tenant. Los administradores tienen acceso a todos los bots.
          </>
        }
      />

      {loading && <Loading />}

      {!loading && (
        <div className="space-y-3">
          {members.map((m) => (
            <Card key={m.userId} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-fg">{m.name}</p>
                  <p className="text-xs text-fg3">{m.email}</p>
                </div>
                <Badge tone={m.role === "org:admin" ? "accent" : "neutral"} mono>
                  {m.role === "org:admin" ? "admin" : "miembro"}
                </Badge>
              </div>

              {m.role === "org:admin" ? (
                <p className="text-sm text-fg3">Acceso a todos los bots del tenant.</p>
              ) : bots.length === 0 ? (
                <p className="text-sm text-fg3">No hay bots para asignar.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bots.map((bot) => {
                    const active = !!findAssignment(bot.id, m.userId);
                    return (
                      <button
                        key={bot.id}
                        onClick={() => toggle(bot.id, m.userId)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-xs transition-colors duration-200",
                          active
                            ? "border-accent bg-accent text-on-accent"
                            : "border-line text-fg2 hover:border-accent hover:text-fg",
                        )}
                      >
                        {active && <Check className="h-3 w-3" />}
                        {bot.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          ))}
          {members.length === 0 && (
            <EmptyState title="Sin miembros" description="Aún no hay miembros en el tenant." />
          )}
        </div>
      )}
    </section>
  );
}
