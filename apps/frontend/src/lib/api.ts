import type {
  Bot,
  CreateBotInput,
  UpdateBotInput,
  Me,
  TenantMember,
  BotAssignment,
  CreateAssignmentInput,
  AdminTenant,
  CreateTenantInput,
  BotConnection,
  ChatwootProvision,
  IdentityType,
  IdentityDoc,
  IdentityVersion,
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
    getBot: (id: string) => request<Bot>(`/api/bots/${id}`),

    // Conexión WhatsApp (E02)
    startConnection: (botId: string) =>
      request<BotConnection>(`/api/bots/${botId}/connection`, { method: "POST" }),
    getConnection: (botId: string) =>
      request<BotConnection>(`/api/bots/${botId}/connection`),
    disconnect: (botId: string) =>
      request<{ status: string }>(`/api/bots/${botId}/connection`, { method: "DELETE" }),

    // Chatwoot (E03)
    getChatwoot: (botId: string) =>
      request<{ accountId: number | null; inboxId: number | null; dashboardUrl: string | null }>(
        `/api/bots/${botId}/chatwoot`,
      ),
    provisionChatwoot: (botId: string) =>
      request<ChatwootProvision>(`/api/bots/${botId}/chatwoot/provision`, { method: "POST" }),
    addChatwootAgent: (botId: string, userId: string) =>
      request<{ userId: number }>(`/api/bots/${botId}/chatwoot/agents`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),

    // Identidad del agente (E04)
    getIdentity: (botId: string) =>
      request<Record<IdentityType, IdentityDoc | null>>(`/api/bots/${botId}/identity`),
    saveIdentity: (botId: string, type: IdentityType, content: string) =>
      request<{ version: number }>(`/api/bots/${botId}/identity/${type}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    listIdentityVersions: (botId: string, type: IdentityType) =>
      request<IdentityVersion[]>(`/api/bots/${botId}/identity/${type}/versions`),
    restoreIdentityVersion: (botId: string, type: IdentityType, version: number) =>
      request<{ version: number }>(
        `/api/bots/${botId}/identity/${type}/versions/${version}/restore`,
        { method: "POST" },
      ),

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

    // Plataforma (super admin)
    listTenants: () => request<AdminTenant[]>("/api/admin/tenants"),
    createTenant: (input: CreateTenantInput) =>
      request<{ id: string; name: string }>("/api/admin/tenants", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    blockTenant: (id: string, reason?: string) =>
      request<{ id: string; blocked: boolean }>(`/api/admin/tenants/${id}/block`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    unblockTenant: (id: string) =>
      request<{ id: string; blocked: boolean }>(`/api/admin/tenants/${id}/unblock`, {
        method: "POST",
      }),
  };
}

export type Api = ReturnType<typeof createApi>;
