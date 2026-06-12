import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/useApi";
import { Button, Card, ErrorText, Loading } from "@/components/ui";
import { cn } from "@/lib/utils";

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

  if (error) return <ErrorText>Error: {(error as Error).message}</ErrorText>;
  if (!conn) return <Loading />;

  const dotColor =
    conn.status === "connected"
      ? "bg-ok"
      : conn.status === "qr"
        ? "bg-warn"
        : "bg-fg3";

  return (
    <Card className="max-w-xl p-6">
      <div className="flex items-center gap-2">
        <span className={cn("inline-block h-2.5 w-2.5 rounded-full", dotColor)} />
        <span className="font-medium text-fg">
          {conn.status === "connected"
            ? "Conectado"
            : conn.status === "qr"
              ? "Esperando escaneo del QR"
              : "Desconectado"}
        </span>
        {conn.lastConnectedAt && (
          <span className="text-sm text-fg3">
            · última conexión {new Date(conn.lastConnectedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="mt-5">
        {conn.status === "connected" ? (
          isAdmin && (
            <Button
              variant="danger"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? "Desvinculando…" : "Desvincular número"}
            </Button>
          )
        ) : timedOut ? (
          <div className="space-y-3">
            <p className="text-sm text-fg3">
              El QR expiró sin escanearse. Vuelve a intentarlo.
            </p>
            {isAdmin && <Button onClick={() => start.mutate()}>Generar nuevo QR</Button>}
          </div>
        ) : conn.qr ? (
          <div className="space-y-3">
            <img
              src={conn.qr.startsWith("data:") ? conn.qr : `data:image/png;base64,${conn.qr}`}
              alt="QR para vincular WhatsApp"
              className="h-64 w-64 rounded-lg border border-line bg-white p-2"
            />
            <p className="text-sm text-fg3">
              Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo y escanea el
              código.
            </p>
          </div>
        ) : isAdmin ? (
          <Button onClick={() => start.mutate()} disabled={start.isPending}>
            {start.isPending ? "Creando instancia…" : "Conectar WhatsApp"}
          </Button>
        ) : (
          <p className="text-sm text-fg3">Pide a un administrador que conecte el número.</p>
        )}
      </div>

      {(start.error || disconnect.error) && (
        <ErrorText className="mt-3">
          {((start.error ?? disconnect.error) as Error).message}
        </ErrorText>
      )}
    </Card>
  );
}
