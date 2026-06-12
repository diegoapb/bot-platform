import { env } from "../env.js";

/**
 * Cliente de Chatwoot (en Dokploy). Dos niveles:
 *  - Platform API (`/platform/api/v1`, header `api_access_token` = platform token):
 *    crear cuentas y usuarios, asociarlos.
 *  - Application API (`/api/v1/accounts/:id`, token de usuario admin):
 *    contactos, conversaciones y mensajes, scopeado por cuenta.
 * Docs: https://www.chatwoot.com/developers/api
 */
export class ChatwootError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`Chatwoot API ${status}: ${body}`);
  }
}

async function call<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        api_access_token: token,
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    throw new ChatwootError(0, e instanceof Error ? e.message : "fetch failed");
  }
  if (!res.ok) {
    throw new ChatwootError(res.status, await res.text());
  }
  return (await res.json().catch(() => ({}))) as T;
}

const platform = (path: string, init?: RequestInit) =>
  call<any>(`${env.CHATWOOT_API_URL}/platform/api/v1${path}`, env.CHATWOOT_PLATFORM_TOKEN, init);

const app = (accountId: number, path: string, init?: RequestInit) =>
  call<any>(
    `${env.CHATWOOT_API_URL}/api/v1/accounts/${accountId}${path}`,
    env.CHATWOOT_API_TOKEN,
    init,
  );

export const chatwoot = {
  // --- Platform API (provisión) ---------------------------------------

  /** Crea una cuenta de Chatwoot para un tenant. */
  createAccount: async (name: string): Promise<{ id: number }> => {
    const res = await platform("/accounts", { method: "POST", body: JSON.stringify({ name }) });
    return { id: res.id };
  },

  /** Crea un usuario a nivel plataforma (agente del tenant). */
  createPlatformUser: async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ id: number }> => {
    const res = await platform("/users", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    return { id: res.id };
  },

  /** Busca un usuario de plataforma por email. null si no existe. */
  findUserByEmail: async (email: string): Promise<{ id: number } | null> => {
    try {
      const res = await platform(`/users?email=${encodeURIComponent(email)}`);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      const hit = list.find((u: any) => u.email === email);
      return hit ? { id: hit.id } : null;
    } catch (e) {
      if (e instanceof ChatwootError && e.status === 404) return null;
      throw e;
    }
  },

  /**
   * Asocia un usuario de plataforma a una cuenta con un rol. Idempotente: si el
   * usuario ya pertenece a la cuenta, Chatwoot responde 422 y lo tratamos como OK.
   */
  attachUserToAccount: async (
    accountId: number,
    userId: number,
    role: "agent" | "administrator",
  ): Promise<void> => {
    try {
      await platform(`/accounts/${accountId}/account_users`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, role }),
      });
    } catch (e) {
      if (e instanceof ChatwootError && e.status === 422) return;
      throw e;
    }
  },

  // --- Application API (mensajería, por cuenta) ------------------------

  /** Crea un inbox de tipo API en la cuenta del tenant. */
  createApiInbox: async (
    accountId: number,
    name: string,
    webhookUrl: string,
  ): Promise<{ id: number; identifier: string }> => {
    const res = await app(accountId, "/inboxes", {
      method: "POST",
      body: JSON.stringify({ name, channel: { type: "api", webhook_url: webhookUrl } }),
    });
    return { id: res.id, identifier: res.inbox_identifier ?? res.identifier ?? "" };
  },

  listInboxes: (accountId: number) => app(accountId, "/inboxes") as Promise<{ payload: unknown[] }>,

  // --- Inboxes por tipo de canal (E11) ---------------------------------

  /** Crea un inbox de Telegram (Chatwoot registra el webhook en Telegram). */
  createTelegramInbox: async (
    accountId: number,
    name: string,
    botToken: string,
  ): Promise<{ id: number }> => {
    const res = await app(accountId, "/inboxes", {
      method: "POST",
      body: JSON.stringify({ name, channel: { type: "telegram", bot_token: botToken } }),
    });
    return { id: res.id };
  },

  /** Crea un inbox de WhatsApp Cloud API (oficial de Meta). */
  createWhatsappCloudInbox: async (
    accountId: number,
    name: string,
    cfg: {
      phoneNumber: string;
      phoneNumberId: string;
      businessAccountId: string;
      apiKey: string;
    },
  ): Promise<{ id: number }> => {
    const res = await app(accountId, "/inboxes", {
      method: "POST",
      body: JSON.stringify({
        name,
        channel: {
          type: "whatsapp",
          provider: "whatsapp_cloud",
          phone_number: cfg.phoneNumber,
          provider_config: {
            api_key: cfg.apiKey,
            phone_number_id: cfg.phoneNumberId,
            business_account_id: cfg.businessAccountId,
          },
        },
      }),
    });
    return { id: res.id };
  },

  /**
   * Registra una página de Facebook como inbox (Messenger). Para Instagram la
   * página debe tener la cuenta de IG vinculada; Chatwoot enruta los DM por el
   * mismo callback de Meta. Requiere FB_APP_ID/SECRET configurados en Chatwoot.
   */
  registerFacebookPage: async (
    accountId: number,
    cfg: {
      pageId: string;
      userAccessToken: string;
      pageAccessToken: string;
      inboxName: string;
    },
  ): Promise<{ id: number }> => {
    const res = await app(accountId, "/callbacks/register_facebook_page", {
      method: "POST",
      body: JSON.stringify({
        page_id: cfg.pageId,
        user_access_token: cfg.userAccessToken,
        page_access_token: cfg.pageAccessToken,
        inbox_name: cfg.inboxName,
      }),
    });
    return { id: res.id };
  },

  /** Elimina un inbox (al desconectar un canal). */
  deleteInbox: (accountId: number, inboxId: number) =>
    app(accountId, `/inboxes/${inboxId}`, { method: "DELETE" }),

  /**
   * Webhook a nivel de cuenta: Chatwoot manda los eventos suscritos de TODOS
   * los inboxes de la cuenta a `url`. Es la entrada del pipeline agnóstico de
   * canal (US-022).
   */
  createAccountWebhook: async (
    accountId: number,
    url: string,
    subscriptions: string[],
  ): Promise<{ id: number }> => {
    const res = await app(accountId, "/webhooks", {
      method: "POST",
      body: JSON.stringify({ webhook: { url, subscriptions } }),
    });
    return { id: res.payload?.webhook?.id ?? res.id };
  },

  /** Busca un contacto por teléfono E.164. null si no existe. */
  searchContact: async (
    accountId: number,
    phoneE164: string,
  ): Promise<{ id: number } | null> => {
    const res = await app(accountId, `/contacts/search?q=${encodeURIComponent(phoneE164)}`);
    const hit = (res.payload ?? []).find((c: any) => c.phone_number === phoneE164);
    return hit ? { id: hit.id } : null;
  },

  /** Crea un contacto con nombre y teléfono. */
  createContact: async (
    accountId: number,
    name: string,
    phoneE164: string,
  ): Promise<{ id: number }> => {
    const res = await app(accountId, "/contacts", {
      method: "POST",
      body: JSON.stringify({ name, phone_number: phoneE164 }),
    });
    const contact = res.payload?.contact ?? res.payload ?? res;
    return { id: contact.id };
  },

  /** Crea una conversación para un contacto en un inbox. */
  createConversation: async (
    accountId: number,
    inboxId: number,
    contactId: number,
  ): Promise<{ id: number }> => {
    const res = await app(accountId, "/conversations", {
      method: "POST",
      body: JSON.stringify({ inbox_id: inboxId, contact_id: contactId }),
    });
    return { id: res.id };
  },

  /** Últimos mensajes de una conversación (orden cronológico de Chatwoot). */
  listMessages: async (
    accountId: number,
    conversationId: number,
  ): Promise<
    Array<{
      id: number;
      content: string | null;
      message_type: number;
      private: boolean;
      created_at: number;
      content_attributes?: Record<string, unknown> | null;
      sender?: { id?: number; name?: string; type?: string } | null;
    }>
  > => {
    const res = await app(accountId, `/conversations/${conversationId}/messages`);
    return res.payload ?? [];
  },

  /** Reemplaza las etiquetas de una conversación. */
  setLabels: (accountId: number, conversationId: number, labels: string[]) =>
    app(accountId, `/conversations/${conversationId}/labels`, {
      method: "POST",
      body: JSON.stringify({ labels }),
    }),

  /** Etiquetas actuales de una conversación. */
  getLabels: async (accountId: number, conversationId: number): Promise<string[]> => {
    const res = await app(accountId, `/conversations/${conversationId}/labels`);
    return res.payload ?? [];
  },

  /** Cambia la prioridad de una conversación (urgent/high/medium/low/null). */
  setPriority: (accountId: number, conversationId: number, priority: string | null) =>
    app(accountId, `/conversations/${conversationId}/toggle_priority`, {
      method: "POST",
      body: JSON.stringify({ priority }),
    }),

  /** Crea un mensaje en una conversación (incoming/outgoing, opc. privado). */
  createMessage: (
    accountId: number,
    conversationId: number,
    content: string,
    messageType: "incoming" | "outgoing",
    opts?: { private?: boolean; contentAttributes?: Record<string, unknown> },
  ): Promise<{ id: number }> =>
    app(accountId, `/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content,
        message_type: messageType,
        private: opts?.private ?? false,
        ...(opts?.contentAttributes ? { content_attributes: opts.contentAttributes } : {}),
      }),
    }),
};
