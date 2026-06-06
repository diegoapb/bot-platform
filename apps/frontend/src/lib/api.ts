import type {
  Bot,
  CreateBotInput,
  UpdateBotInput,
  Me,
  TenantMember,
  BotAssignment,
  CreateAssignmentInput,
} from "@bot/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "";

/**
 * Cliente fetch que adjunta el token de sesión de Clerk (con claims de org).
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
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      data?: T;
      error?: string;
    };
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    return json.data as T;
  }

  return {
    // Identidad / tenant
    me: () => request<Me>("/api/me"),

    // Bots
    listBots: () => request<Bot[]>("/api/bots"),
    createBot: (input: CreateBotInput) =>
      request<Bot>("/api/bots", { method: "POST", body: JSON.stringify(input) }),
    updateBot: (id: string, input: UpdateBotInput) =>
      request<Bot>(`/api/bots/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    deleteBot: (id: string) =>
      request<{ id: string }>(`/api/bots/${id}`, { method: "DELETE" }),

    // Equipo (admin)
    listMembers: () => request<TenantMember[]>("/api/team/members"),
    listAssignments: () => request<BotAssignment[]>("/api/team/assignments"),
    createAssignment: (input: CreateAssignmentInput) =>
      request<BotAssignment>("/api/team/assignments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    deleteAssignment: (id: string) =>
      request<{ id: string }>(`/api/team/assignments/${id}`, { method: "DELETE" }),
  };
}

export type Api = ReturnType<typeof createApi>;
