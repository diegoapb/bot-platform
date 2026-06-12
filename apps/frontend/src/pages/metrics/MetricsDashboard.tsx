import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/lib/useApi";
import {
  Card,
  CardBody,
  CardTitle,
  ErrorText,
  Loading,
  PageHeader,
  StatTile,
} from "@/components/ui";
import { cn } from "@/lib/utils";

/** Métricas del tenant (US-014 R2): totales + serie diaria. */
export function MetricsDashboard() {
  const api = useApi();
  const [range, setRange] = useState<"7d" | "30d">("7d");

  const { data, isLoading, error } = useQuery({
    queryKey: ["metrics", range],
    queryFn: () => api.getMetrics(range),
  });

  const cards = [
    { label: "Mensajes entrantes", value: data?.inbound },
    { label: "Respuestas del bot", value: data?.botReplies },
    { label: "Handoffs a humano", value: data?.handoffs },
    { label: "Conversaciones activas", value: data?.activeConversations },
  ];

  return (
    <section>
      <PageHeader
        eyebrow="Resultados"
        eyebrowNum="03"
        title="Métricas"
        description="Actividad del tenant en el rango seleccionado."
        actions={
          <div className="flex gap-1 rounded-pill border border-line p-1">
            {(["7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-pill px-3 py-1 text-sm transition-colors duration-200",
                  range === r ? "bg-accent text-on-accent" : "text-fg3 hover:text-fg",
                )}
              >
                {r === "7d" ? "7 días" : "30 días"}
              </button>
            ))}
          </div>
        }
      />

      {isLoading && <Loading />}
      {error && <ErrorText>{(error as Error).message}</ErrorText>}

      {data && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {cards.map((card) => (
              <StatTile key={card.label} value={card.value ?? "—"} label={card.label} />
            ))}
          </div>

          <Card>
            <CardBody>
              <CardTitle className="mb-4 font-mono text-xs uppercase tracking-wide text-fg3">
                Actividad por día
              </CardTitle>
              {data.daily.length === 0 ? (
                <p className="text-sm text-fg3">Sin actividad en el rango.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="day" fontSize={11} stroke="var(--fg3)" />
                    <YAxis allowDecimals={false} fontSize={11} stroke="var(--fg3)" />
                    <Tooltip
                      cursor={{ fill: "var(--chip)" }}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        borderRadius: 14,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="inbound" name="Mensajes entrantes" fill="var(--graphite-3)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="botReplies" name="Respuestas del bot" fill="var(--lime-dim)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </section>
  );
}
