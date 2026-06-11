import { env } from "../env.js";

/**
 * Cliente de Evolution API v2 (WhatsApp gateway en Dokploy).
 * Auth: header `apikey`. Docs: https://doc.evolution-api.com
 */
export class EvolutionError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`Evolution API ${status}: ${body}`);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.EVOLUTION_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        apikey: env.EVOLUTION_API_KEY,
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    throw new EvolutionError(0, e instanceof Error ? e.message : "fetch failed");
  }
  if (!res.ok) {
    throw new EvolutionError(res.status, await res.text());
  }
  return (await res.json().catch(() => ({}))) as T;
}

/** Estado nativo de Evolution → estado de dominio del bot. */
export function mapConnectionState(state: string): "disconnected" | "qr" | "connected" {
  if (state === "open") return "connected";
  if (state === "connecting") return "qr";
  return "disconnected";
}

export const evolution = {
  /** Lista las instancias (sesiones WhatsApp) registradas. */
  fetchInstances: () => call<unknown[]>("/instance/fetchInstances"),

  /**
   * Crea una instancia y registra el webhook hacia este backend con los
   * eventos de conexión, QR y mensajes.
   */
  createInstance: (name: string, webhookUrl: string) =>
    call<{ instance: { instanceName: string }; qrcode?: { base64?: string } }>(
      "/instance/create",
      {
        method: "POST",
        body: JSON.stringify({
          instanceName: name,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: true,
            headers: { "x-webhook-token": env.EVOLUTION_WEBHOOK_TOKEN },
            events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
          },
        }),
      },
    ),

  /** QR vigente para vincular (null si la instancia ya está conectada). */
  getQr: async (instance: string): Promise<{ base64: string } | null> => {
    const res = await call<{ base64?: string; code?: string }>(`/instance/connect/${instance}`);
    return res.base64 ? { base64: res.base64 } : null;
  },

  /** Estado de conexión de una instancia (open / connecting / close). */
  connectionState: async (instance: string) => {
    const res = await call<{ instance: { state: string } }>(
      `/instance/connectionState/${instance}`,
    );
    return res.instance.state as "open" | "connecting" | "close";
  },

  /** Cierra la sesión de WhatsApp (desvincula el teléfono). */
  logout: (instance: string) =>
    call(`/instance/logout/${instance}`, { method: "DELETE" }).then(() => undefined),

  /** Elimina la instancia por completo. */
  deleteInstance: (instance: string) =>
    call(`/instance/delete/${instance}`, { method: "DELETE" }).then(() => undefined),

  /** Envía un mensaje de texto a un número/jid desde una instancia. */
  sendText: (instance: string, to: string, text: string) =>
    call(`/message/sendText/${instance}`, {
      method: "POST",
      body: JSON.stringify({ number: to, text }),
    }),
};
