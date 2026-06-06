import { env } from "../env.js";

/**
 * Cliente mínimo de Evolution API (WhatsApp gateway en Dokploy).
 * Auth: header `apikey`. Docs: https://doc.evolution-api.com
 */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.EVOLUTION_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: env.EVOLUTION_API_KEY,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export const evolution = {
  /** Lista las instancias (sesiones WhatsApp) registradas. */
  fetchInstances: () => call<unknown[]>("/instance/fetchInstances"),

  /** Envía un mensaje de texto a un número desde una instancia. */
  sendText: (instance: string, to: string, text: string) =>
    call(`/message/sendText/${instance}`, {
      method: "POST",
      body: JSON.stringify({ number: to, text }),
    }),

  /** Estado de conexión de una instancia (open / connecting / close). */
  connectionState: (instance: string) =>
    call<{ instance: { state: string } }>(`/instance/connectionState/${instance}`),
};
