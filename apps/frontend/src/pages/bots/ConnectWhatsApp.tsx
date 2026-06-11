import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/useApi";

const POLL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

/** Vinculación del número WhatsApp por QR, con polling y timeout de 5 min. */
export function ConnectWhatsApp({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef<number | null>(null);

  const { data: conn, error } = useQuery({
    queryKey: ["connection", botId],
    queryFn: () => api.getConnection(botId),
    // Polling solo mientras esperamos el escaneo; para al conectar o expirar.
    refetchInterval: (q) =>
      q.state.data?.status === "connected" || timedOut ? false : POLL_MS,
  });

  useEffect(() => {
    if (conn?.status === "qr" && startedAt.current === null) {
      startedAt.current = Date.now();
    }
    if (conn?.status === "connected") {
      startedAt.current = null;
      setTimedOut(false);
    }
    if (startedAt.current && Date.now() - startedAt.current > TIMEOUT_MS) {
      setTimedOut(true);
    }
  }, [conn]);

  const start = useMutation({
    mutationFn: () => api.startConnection(botId),
    onSuccess: () => {
      startedAt.current = Date.now();
      setTimedOut(false);
      qc.invalidateQueries({ queryKey: ["connection", botId] });
    },
  });

  const disconnect = useMutation({
    mutationFn: () => api.disconnect(botId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connection", botId] }),
  });

  if (error) return <p className="text-red-600">Error: {(error as Error).message}</p>;
  if (!conn) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            conn.status === "connected"
              ? "bg-green-500"
              : conn.status === "qr"
                ? "bg-yellow-500"
                : "bg-gray-400"
          }`}
        />
        <span className="font-medium">
          {conn.status === "connected"
            ? "Conectado"
            : conn.status === "qr"
              ? "Esperando escaneo del QR"
              : "Desconectado"}
        </span>
        {conn.lastConnectedAt && (
          <span className="text-sm text-muted-foreground">
            · última conexión {new Date(conn.lastConnectedAt).toLocaleString()}
          </span>
        )}
      </div>

      {conn.status === "connected" ? (
        isAdmin && (
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="rounded-md border px-4 py-2 text-sm text-red-600 disabled:opacity-50"
          >
            {disconnect.isPending ? "Desvinculando…" : "Desvincular número"}
          </button>
        )
      ) : timedOut ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            El QR expiró sin escanearse. Vuelve a intentarlo.
          </p>
          {isAdmin && (
            <button
              onClick={() => start.mutate()}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Generar nuevo QR
            </button>
          )}
        </div>
      ) : conn.qr ? (
        <div className="space-y-2">
          <img
            src={conn.qr.startsWith("data:") ? conn.qr : `data:image/png;base64,${conn.qr}`}
            alt="QR para vincular WhatsApp"
            className="h-64 w-64 rounded-lg border"
          />
          <p className="text-sm text-muted-foreground">
            Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo y escanea el código.
          </p>
        </div>
      ) : isAdmin ? (
        <button
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {start.isPending ? "Creando instancia…" : "Conectar WhatsApp"}
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Pide a un administrador que conecte el número.
        </p>
      )}

      {(start.error || disconnect.error) && (
        <p className="text-sm text-red-600">
          {((start.error ?? disconnect.error) as Error).message}
        </p>
      )}
    </div>
  );
}
