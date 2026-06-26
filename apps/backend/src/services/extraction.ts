import { eq } from "drizzle-orm";
import {
  sanitizeAgainstSchema,
  validateDataAgainstSchema,
  validateExtractionSchema,
  type ExtractionSchema,
} from "@bot/shared";
import { db } from "../db/client.js";
import {
  agents,
  channelLinks,
  extractedData,
  tenants,
  type AgentRow,
  type ChannelLinkRow,
  type ConversationRow,
  type ExtractedDataRow,
} from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { generate, textOf } from "../integrations/llm.js";
import { contactIdForLink } from "./memory.js";

/**
 * Extracción de información estructurada (E12/US-028) reanclada al contacto
 * unificado (E13/US-033): el LLM completa el JSON definido por el
 * `extractionSchema` del **agente**. Incremental, no pisa `manualKeys`. Los datos
 * se comparten entre los canales del contacto.
 */

export type Extraction = {
  data: Record<string, unknown>;
  manualKeys: string[];
  provenance: Record<string, { source: "bot" | "human"; at: string }>;
  updatedAt: Date | null;
};

const EMPTY: Extraction = { data: {}, manualKeys: [], provenance: {}, updatedAt: null };

/** Datos extraídos del contacto unificado. */
export async function getExtraction(contactId: string): Promise<Extraction> {
  const [row] = await db
    .select()
    .from(extractedData)
    .where(eq(extractedData.contactId, contactId));
  if (!row) return EMPTY;
  return {
    data: row.data,
    manualKeys: row.manualKeys,
    provenance: row.provenance,
    updatedAt: row.updatedAt,
  };
}

/** Datos extraídos a partir de un channel_link (resuelve su contacto). */
export async function getExtractionForLink(link: ChannelLinkRow): Promise<Extraction> {
  if (!link.contactId) return EMPTY;
  return getExtraction(link.contactId);
}

/** Esquema vigente del agente, ya validado. null = extracción desactivada. */
export function parseAgentSchema(
  agent: Pick<AgentRow, "extractionSchema">,
): ExtractionSchema | null {
  if (!agent.extractionSchema) return null;
  if (validateExtractionSchema(agent.extractionSchema).length > 0) return null;
  return agent.extractionSchema as unknown as ExtractionSchema;
}

/**
 * Edición manual (US-029): reemplaza los datos con el JSON del editor, validado
 * contra el esquema del agente. Claves nuevas/cambiadas quedan marcadas como
 * manuales; las eliminadas se borran (también su marca y procedencia).
 */
export async function updateExtractionManual(
  link: ChannelLinkRow,
  agent: AgentRow,
  data: Record<string, unknown>,
): Promise<{ errors: string[]; extraction?: Extraction }> {
  const schema = parseAgentSchema(agent);
  if (!schema) return { errors: ["El agente no tiene esquema de extracción configurado"] };

  const errors = validateDataAgainstSchema(schema, data);
  if (errors.length > 0) return { errors };

  const contactId = await contactIdForLink(link);
  const prev = await getExtraction(contactId);
  const now = new Date().toISOString();
  const manual = new Set(prev.manualKeys.filter((k) => k in data));
  const provenance: Extraction["provenance"] = {};
  for (const [key, value] of Object.entries(data)) {
    const changed = JSON.stringify(prev.data[key]) !== JSON.stringify(value);
    if (changed) manual.add(key);
    provenance[key] = changed
      ? { source: "human", at: now }
      : (prev.provenance[key] ?? { source: "human", at: now });
  }

  const row = await upsert(link, contactId, data, [...manual], provenance);
  return {
    errors: [],
    extraction: {
      data: row.data,
      manualKeys: row.manualKeys,
      provenance: row.provenance,
      updatedAt: row.updatedAt,
    },
  };
}

/**
 * Extracción automática sobre una conversación. Fire-and-forget desde el motor
 * (tras cada ráfaga) y desde el job de consolidación (E07). Usa el agente fijado
 * en la conversación (E13/US-031).
 */
export async function runExtraction(convo: ConversationRow): Promise<void> {
  try {
    const [agent] = await db.select().from(agents).where(eq(agents.id, convo.agentId));
    if (!agent) return;
    const schema = parseAgentSchema(agent);
    if (!schema) return;

    const [link] = await db
      .select()
      .from(channelLinks)
      .where(eq(channelLinks.id, convo.channelLinkId));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, convo.tenantId));
    if (!link || !tenant?.chatwootAccountId) return;
    const contactId = await contactIdForLink(link);

    const raw = await chatwoot.listMessages(tenant.chatwootAccountId, link.cwConversationId);
    const transcript = raw
      .filter((m) => !m.private && m.content)
      .slice(-50)
      .map((m) => `${m.message_type === 0 ? "Cliente" : "Equipo"}: ${m.content}`)
      .join("\n");
    if (!transcript) return;

    const prev = await getExtraction(contactId);
    const result = await generate({
      system: [
        "Eres un extractor de datos estructurados para un negocio.",
        "A partir del transcript, completa los campos del esquema. Devuelve SOLO un JSON válido, plano, con (un subconjunto de) las claves del esquema.",
        "- Solo incluye una clave si la conversación da evidencia clara de su valor.",
        "- No inventes valores. Si no hay dato nuevo para una clave, omítela.",
        `Esquema (JSON Schema):\n${JSON.stringify(schema)}`,
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `Datos vigentes:\n${JSON.stringify(prev.data)}\n\nTranscript:\n${transcript}`,
        },
      ],
      maxTokens: 1000,
    });

    const text = textOf(result);
    const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const extracted = sanitizeAgainstSchema(
      schema,
      JSON.parse(jsonText) as Record<string, unknown>,
    );

    const now = new Date().toISOString();
    const data = { ...prev.data };
    const provenance = { ...prev.provenance };
    let changed = false;
    for (const [key, value] of Object.entries(extracted)) {
      if (prev.manualKeys.includes(key)) continue; // no pisar ediciones humanas
      if (JSON.stringify(data[key]) === JSON.stringify(value)) continue;
      data[key] = value;
      provenance[key] = { source: "bot", at: now };
      changed = true;
    }
    if (!changed) return;

    await upsert(link, contactId, data, prev.manualKeys, provenance);
  } catch (e) {
    console.warn(`[extraction] fallo en convo ${convo.id}:`, e instanceof Error ? e.message : e);
  }
}

async function upsert(
  link: ChannelLinkRow,
  contactId: string,
  data: Record<string, unknown>,
  manualKeys: string[],
  provenance: Extraction["provenance"],
): Promise<ExtractedDataRow> {
  const values = {
    channelLinkId: link.id,
    contactId,
    tenantId: link.tenantId,
    botId: link.botId,
    data,
    manualKeys,
    provenance,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(extractedData)
    .values(values)
    // En conflicto por contact_id solo cambian los campos mutables; no se toca
    // el ancla (channel_link_id es PK, contact_id/tenant/bot son estables).
    .onConflictDoUpdate({
      target: extractedData.contactId,
      set: { data, manualKeys, provenance, updatedAt: values.updatedAt },
    })
    .returning();
  return row!;
}
