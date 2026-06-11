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

  /** Crea un mensaje en una conversación (incoming/outgoing, opc. privado). */
  createMessage: (
    accountId: number,
    conversationId: number,
    content: string,
    messageType: "incoming" | "outgoing",
    opts?: { private?: boolean },
  ) =>
    app(accountId, `/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content,
        message_type: messageType,
        private: opts?.private ?? false,
      }),
    }),
};
