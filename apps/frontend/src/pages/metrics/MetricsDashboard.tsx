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
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Métricas</h1>
          <p className="text-sm text-muted-foreground">Actividad del tenant en el rango.</p>
        </div>
        <div className="flex gap-1 rounded-md border p-1">
          {(["7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-sm ${
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {r === "7d" ? "7 días" : "30 días"}
            </button>
          ))}
        </div>
      </header>

      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}

      {data && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-lg border p-4">
                <p className="text-3xl font-semibold">{card.value ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-sm font-medium">Actividad por día</h3>
            {data.daily.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad en el rango.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="inbound" name="Mensajes entrantes" fill="#94a3b8" />
                  <Bar dataKey="botReplies" name="Respuestas del bot" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </section>
  );
}
