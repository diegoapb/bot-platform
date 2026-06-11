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
  KnowledgeSource,
  CreateSourceInput,
  ScoredChunk,
  CatalogItem,
  CatalogItemInput,
  UpdateCatalogItemInput,
  ImportReport,
  ConversationSummary,
  ConversationTransition,
  ConversationMode,
  ContactSummary,
  ContactMemory,
  PhoneRule,
  CreatePhoneRuleInput,
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

  /** Variante multipart: no fija Content-Type (lo pone el browser con boundary). */
  async function requestForm<T>(path: string, form: FormData): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
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

    // Audiencia: lista blanca / negra de teléfonos
    listPhoneRules: (botId: string) =>
      request<PhoneRule[]>(`/api/bots/${botId}/phone-rules`),
    addPhoneRule: (botId: string, input: CreatePhoneRuleInput) =>
      request<PhoneRule>(`/api/bots/${botId}/phone-rules`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    deletePhoneRule: (botId: string, ruleId: string) =>
      request<{ id: string }>(`/api/bots/${botId}/phone-rules/${ruleId}`, { method: "DELETE" }),

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

    // Base de conocimiento (E05 / US-009)
    listKnowledge: (botId: string) =>
      request<KnowledgeSource[]>(`/api/bots/${botId}/knowledge`),
    createKnowledgeSource: (botId: string, input: CreateSourceInput) =>
      request<{ id: string }>(`/api/bots/${botId}/knowledge`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    uploadKnowledgeFile: (botId: string, file: File, title?: string) => {
      const form = new FormData();
      form.set("file", file);
      if (title) form.set("title", title);
      return requestForm<{ id: string }>(`/api/bots/${botId}/knowledge`, form);
    },
    deleteKnowledgeSource: (botId: string, sourceId: string) =>
      request<{ id: string }>(`/api/bots/${botId}/knowledge/${sourceId}`, { method: "DELETE" }),
    reindexKnowledgeSource: (botId: string, sourceId: string) =>
      request<{ id: string }>(`/api/bots/${botId}/knowledge/${sourceId}/reindex`, {
        method: "POST",
      }),
    searchKnowledge: (botId: string, query: string, k?: number) =>
      request<ScoredChunk[]>(`/api/bots/${botId}/knowledge/search`, {
        method: "POST",
        body: JSON.stringify({ query, k }),
      }),

    // Catálogo (E05 / US-010)
    listCatalog: (botId: string, filter?: { q?: string; availability?: string }) => {
      const params = new URLSearchParams();
      if (filter?.q) params.set("q", filter.q);
      if (filter?.availability) params.set("availability", filter.availability);
      const qs = params.toString();
      return request<CatalogItem[]>(`/api/bots/${botId}/catalog${qs ? `?${qs}` : ""}`);
    },
    createCatalogItem: (botId: string, input: CatalogItemInput) =>
      request<CatalogItem>(`/api/bots/${botId}/catalog`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    updateCatalogItem: (botId: string, itemId: string, patch: UpdateCatalogItemInput) =>
      request<CatalogItem>(`/api/bots/${botId}/catalog/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    archiveCatalogItem: (botId: string, itemId: string, archived: boolean) =>
      request<CatalogItem>(`/api/bots/${botId}/catalog/${itemId}/archive`, {
        method: "POST",
        body: JSON.stringify({ archived }),
      }),
    importCatalogCsv: (botId: string, file: File) => {
      const form = new FormData();
      form.set("file", file);
      return requestForm<ImportReport>(`/api/bots/${botId}/catalog/import`, form);
    },

    // Conversaciones (E06)
    listConversations: (botId: string) =>
      request<ConversationSummary[]>(`/api/bots/${botId}/conversations`),
    listAllConversations: (opts?: {
      cursor?: string;
      botId?: string;
      mode?: ConversationMode;
    }) => {
      const params = new URLSearchParams();
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.botId) params.set("botId", opts.botId);
      if (opts?.mode) params.set("mode", opts.mode);
      const qs = params.toString();
      return request<{
        items: Array<ConversationSummary & { botName: string }>;
        nextCursor: string | null;
      }>(`/api/conversations${qs ? `?${qs}` : ""}`);
    },
    getConversationMessages: (conversationId: string) =>
      request<
        Array<{
          id: number;
          content: string;
          origin: "cliente" | "bot" | "agente";
          senderName: string | null;
          createdAt: string;
        }>
      >(`/api/conversations/${conversationId}/messages`),
    listTransitions: (conversationId: string) =>
      request<ConversationTransition[]>(`/api/conversations/${conversationId}/transitions`),
    setConversationMode: (conversationId: string, mode: ConversationMode) =>
      request<{ mode: ConversationMode; changed: boolean }>(
        `/api/conversations/${conversationId}/mode`,
        { method: "POST", body: JSON.stringify({ mode }) },
      ),

    // Métricas y trazas (E08)
    getMetrics: (range: "7d" | "30d") =>
      request<{
        range: string;
        inbound: number;
        botReplies: number;
        handoffs: number;
        activeConversations: number;
        daily: Array<{ day: string; inbound: number; botReplies: number }>;
      }>(`/api/metrics?range=${range}`),
    listGenerations: (botId: string, cursor?: string) =>
      request<{
        items: Array<{
          id: string;
          conversationId: string;
          phoneE164: string;
          model: string;
          responsePreview: string | null;
          inputTokens: number | null;
          outputTokens: number | null;
          latencyMs: number | null;
          ok: boolean;
          error: string | null;
          createdAt: string;
        }>;
        nextCursor: string | null;
      }>(`/api/bots/${botId}/generations${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    getGeneration: (id: string) =>
      request<{
        id: string;
        conversationId: string;
        model: string;
        prompt: unknown;
        response: string | null;
        inputTokens: number | null;
        outputTokens: number | null;
        latencyMs: number | null;
        error: string | null;
        createdAt: string;
      }>(`/api/generations/${id}`),

    // Contactos y memoria (E07)
    listContacts: (botId: string) => request<ContactSummary[]>(`/api/bots/${botId}/contacts`),
    getContactMemory: (linkId: string) =>
      request<ContactMemory>(`/api/contacts/${linkId}/memory`),
    upsertContactFact: (linkId: string, key: string, value: string) =>
      request<{ key: string }>(`/api/contacts/${linkId}/memory`, {
        method: "PATCH",
        body: JSON.stringify({ key, value }),
      }),
    deleteContactFact: (linkId: string, key: string) =>
      request<{ key: string }>(
        `/api/contacts/${linkId}/memory/facts/${encodeURIComponent(key)}`,
        { method: "DELETE" },
      ),
    wipeContactMemory: (linkId: string) =>
      request<{ wiped: boolean }>(`/api/contacts/${linkId}/memory`, { method: "DELETE" }),

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
