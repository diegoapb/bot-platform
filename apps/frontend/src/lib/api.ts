import type { Bot, CreateBotInput } from "@bot/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "";

/**
 * Cliente fetch que adjunta el token de sesión de Clerk.
 * Pasa `getToken` desde `useAuth()` de @clerk/clerk-react.
 */
export function createApi(getToken: () => Promise<string | null>) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    const json = (await res.json()) as { ok: boolean; data: T; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Error desconocido");
    return json.data;
  }

  return {
    listBots: () => request<Bot[]>("/api/bots"),
    createBot: (input: CreateBotInput) =>
      request<Bot>("/api/bots", { method: "POST", body: JSON.stringify(input) }),
  };
}

export type Api = ReturnType<typeof createApi>;
