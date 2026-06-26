import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { channelLinks, contacts } from "../db/schema.js";
import type { NormalizedIdentifier } from "./identifier.js";

/**
 * Resolución idempotente del contacto unificado del agente (E13/US-033). Un
 * mismo cliente que escribe por varios canales del mismo agente converge al
 * mismo contacto cuando coincide su identificador (tel/email). Sin identificador
 * fiable → contacto propio del link, sin unificar. Aislamiento por (tenant,
 * agente): nunca cruza agentes ni tenants (P3).
 */

export type ResolveContactResult = { contactId: string; created: boolean; unified: boolean };

/** Contacto propio del link (no fiable), sin unificar con otros (6.1, 6.2, P5). */
export async function ensureLinkOwnContact(args: {
  tenantId: string;
  agentId: string;
  channelLinkId: string;
}): Promise<{ contactId: string }> {
  const [link] = await db
    .select({ contactId: channelLinks.contactId })
    .from(channelLinks)
    .where(eq(channelLinks.id, args.channelLinkId));
  if (link?.contactId) return { contactId: link.contactId }; // P7: no reasignar

  const identifier = `link:${args.channelLinkId}`;
  const inserted = await db
    .insert(contacts)
    .values({ tenantId: args.tenantId, agentId: args.agentId, primaryIdentifier: identifier })
    .onConflictDoNothing({
      target: [contacts.tenantId, contacts.agentId, contacts.primaryIdentifier],
    })
    .returning({ id: contacts.id });
  const contactId =
    inserted[0]?.id ??
    (
      await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.tenantId, args.tenantId),
            eq(contacts.agentId, args.agentId),
            eq(contacts.primaryIdentifier, identifier),
          ),
        )
    )[0]!.id;

  await db
    .update(channelLinks)
    .set({ contactId })
    .where(and(eq(channelLinks.id, args.channelLinkId), isNull(channelLinks.contactId)));
  return { contactId };
}

/**
 * Resuelve o crea el contacto del agente para un identificador entrante y asocia
 * el channel_link (2.1–2.4, 3.1–3.3). Idempotente y a prueba de carreras vía el
 * unique (tenant, agent, primary_identifier) + ON CONFLICT DO NOTHING (2.3, P1).
 */
export async function resolveContact(args: {
  tenantId: string;
  agentId: string;
  channelLinkId: string;
  identifier: NormalizedIdentifier;
}): Promise<ResolveContactResult> {
  const [link] = await db
    .select({ contactId: channelLinks.contactId })
    .from(channelLinks)
    .where(eq(channelLinks.id, args.channelLinkId));
  // P7: si el link ya tiene contacto, se conserva sin reasignar (3.3).
  if (link?.contactId) return { contactId: link.contactId, created: false, unified: false };

  if (!args.identifier.reliable) {
    const { contactId } = await ensureLinkOwnContact(args);
    return { contactId, created: true, unified: false };
  }

  const value = args.identifier.value;
  const inserted = await db
    .insert(contacts)
    .values({ tenantId: args.tenantId, agentId: args.agentId, primaryIdentifier: value })
    .onConflictDoNothing({
      target: [contacts.tenantId, contacts.agentId, contacts.primaryIdentifier],
    })
    .returning({ id: contacts.id });

  const created = inserted.length > 0;
  const contactId =
    inserted[0]?.id ??
    (
      await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.tenantId, args.tenantId),
            eq(contacts.agentId, args.agentId),
            eq(contacts.primaryIdentifier, value),
          ),
        )
    )[0]!.id;

  // unified = el contacto ya tenía otro link asociado (convergencia multicanal).
  let unified = false;
  if (!created) {
    const others = await db
      .select({ id: channelLinks.id })
      .from(channelLinks)
      .where(eq(channelLinks.contactId, contactId))
      .limit(1);
    unified = others.length > 0;
  }

  await db
    .update(channelLinks)
    .set({ contactId })
    .where(and(eq(channelLinks.id, args.channelLinkId), isNull(channelLinks.contactId)));

  return { contactId, created, unified };
}
