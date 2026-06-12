import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { bots, tenants, type BotRow } from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { env } from "../env.js";

/**
 * Provisión idempotente de Chatwoot para un bot: cuenta por tenant → inbox API
 * por bot. Cada paso verifica existencia y persiste inmediatamente, así un
 * fallo en el paso k se reanuda sin repetir los anteriores.
 */
/**
 * Garantiza la cuenta de Chatwoot del tenant (con el usuario del API token
 * adjunto como administrator) y devuelve su id. Idempotente.
 */
export async function ensureChatwootAccount(tenantId: string, fallbackName?: string): Promise<number> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));

  let accountId = tenant?.chatwootAccountId ?? null;
  if (accountId == null) {
    const account = await chatwoot.createAccount(tenant?.name ?? fallbackName ?? tenantId);
    accountId = account.id;
    await db
      .insert(tenants)
      .values({ id: tenantId, chatwootAccountId: accountId })
      .onConflictDoUpdate({
        target: tenants.id,
        set: { chatwootAccountId: accountId, updatedAt: new Date() },
      });
  }
  // El Application API usa CHATWOOT_API_TOKEN, cuyo usuario debe ser miembro de
  // la cuenta. Las cuentas creadas vía Platform API no lo incluyen, así que lo
  // adjuntamos como administrator (idempotente).
  await chatwoot.attachUserToAccount(accountId, env.CHATWOOT_ADMIN_USER_ID, "administrator");
  return accountId;
}

export async function provisionChatwoot(bot: BotRow): Promise<{
  accountId: number;
  inboxId: number;
  dashboardUrl: string;
}> {
  const accountId = await ensureChatwootAccount(bot.tenantId, bot.name);

  let inboxId = bot.chatwootInboxId;
  if (inboxId == null) {
    const webhookToken = bot.chatwootWebhookToken ?? randomUUID();
    const webhookUrl = `${env.PUBLIC_WEBHOOK_BASE_URL}/webhooks/chatwoot/${bot.id}?token=${webhookToken}`;
    const inbox = await chatwoot.createApiInbox(accountId, bot.name, webhookUrl);
    inboxId = inbox.id;
    await db
      .update(bots)
      .set({
        chatwootInboxId: inbox.id,
        chatwootInboxIdentifier: inbox.identifier,
        chatwootWebhookToken: webhookToken,
        updatedAt: new Date(),
      })
      .where(eq(bots.id, bot.id));
  }

  return {
    accountId,
    inboxId,
    dashboardUrl: `${env.CHATWOOT_API_URL}/app/accounts/${accountId}`,
  };
}

/**
 * Da de alta un agente (usuario del tenant) en la cuenta Chatwoot del tenant.
 * Si el email ya existe en Chatwoot, reusa ese usuario.
 */
export async function provisionAgent(
  accountId: number,
  name: string,
  email: string,
): Promise<{ userId: number }> {
  let user = await chatwoot.findUserByEmail(email);
  if (!user) {
    user = await chatwoot.createPlatformUser(name, email, randomUUID());
  }
  await chatwoot.attachUserToAccount(accountId, user.id, "agent");
  return { userId: user.id };
}
