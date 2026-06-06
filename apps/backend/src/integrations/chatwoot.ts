import { env } from "../env.js";

/**
 * Cliente mínimo de la Application API de Chatwoot (en Dokploy).
 * Auth: header `api_access_token`. Docs: https://www.chatwoot.com/developers/api
 */
const base = `${env.CHATWOOT_API_URL}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}`;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      api_access_token: env.CHATWOOT_API_TOKEN,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chatwoot API ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export const chatwoot = {
  /** Lista los inboxes de la cuenta. */
  listInboxes: () => call<{ payload: unknown[] }>("/inboxes"),

  /** Crea un mensaje saliente en una conversación existente. */
  sendMessage: (conversationId: number, content: string) =>
    call(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, message_type: "outgoing" }),
    }),
};
