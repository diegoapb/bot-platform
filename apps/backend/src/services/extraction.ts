import { eq } from "drizzle-orm";
import {
  sanitizeAgainstSchema,
  validateDataAgainstSchema,
  validateExtractionSchema,
  type ExtractionSchema,
} from "@bot/shared";
import { db } from "../db/client.js";
import {
  bots,
  channelLinks,
  extractedData,
  tenants,
  type BotRow,
  type ChannelLinkRow,
  type ConversationRow,
  type ExtractedDataRow,
} from "../db/schema.js";
import { chatwoot } from "../integrations/chatwoot.js";
import { generate, textOf } from "../integrations/llm.js";

/**
 * Extracción de información estructurada (E12/US-028): el LLM completa el JSON
 * definido por el `extractionSchema` del bot a partir del transcript. Es
 * incremental (parte de los datos vigentes) y NUNCA pisa claves corregidas a
 * mano (`manualKeys`). Ante cualquier fallo, los datos previos quedan intactos.
 */

export type Extraction = {
  data: Record<string, unknown>;
  manualKeys: string[];
  provenance: Record<string, { source: "bot" | "human"; at: string }>;
  updatedAt: Date | null;
};

const EMPTY: Extraction = { data: {}, manualKeys: [], provenance: {}, updatedAt: null };

export async function getExtraction(channelLinkId: string): Promise<Extraction> {
  const [row] = await db
    .select()
    .from(extractedData)
    .where(eq(extractedData.channelLinkId, channelLinkId));
  if (!row) return EMPTY;
  return {
    data: row.data,
    manualKeys: row.manualKeys,
    provenance: row.provenance,
    updatedAt: row.updatedAt,
  };
}

/** Esquema vigente del bot, ya validado. null = extracción desactivada. */
export function parseBotSchema(bot: Pick<BotRow, "extractionSchema">): ExtractionSchema | null {
  if (!bot.extractionSchema) return null;
  if (validateExtractionSchema(bot.extractionSchema).length > 0) return null;
  return bot.extractionSchema as unknown as ExtractionSchema;
}

/**
 * Edición manual (US-029): reemplaza los datos con el JSON del editor.
 *  - Valida contra el esquema (claves desconocidas o tipos inválidos = error).
 *  - Claves nuevas o con valor distinto quedan marcadas como manuales.
 *  - Claves eliminadas del JSON se borran (también su marca y procedencia).
 */
export async function updateExtractionManual(
  link: ChannelLinkRow,
  bot: BotRow,
  data: Record<string, unknown>,
): Promise<{ errors: string[]; extraction?: Extraction }> {
  const schema = parseBotSchema(bot);
  if (!schema) return { errors: ["El bot no tiene esquema de extracción configurado"] };

  const errors = validateDataAgainstSchema(schema, data);
  if (errors.length > 0) return { errors };

  const prev = await getExtraction(link.id);
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

  const row = await upsert(link, bot, data, [...manual], provenance);
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
 * (tras cada ráfaga respondida) y desde el job de consolidación (E07).
 */
export async function runExtraction(convo: ConversationRow): Promise<void> {
  try {
    const [bot] = await db.select().from(bots).where(eq(bots.id, convo.botId));
    if (!bot) return;
    const schema = parseBotSchema(bot);
    if (!schema) return;

    const [link] = await db
      .select()
      .from(channelLinks)
      .where(eq(channelLinks.id, convo.channelLinkId));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, convo.tenantId));
    if (!link || !tenant?.chatwootAccountId) return;

    const raw = await chatwoot.listMessages(tenant.chatwootAccountId, link.cwConversationId);
    const transcript = raw
      .filter((m) => !m.private && m.content)
      .slice(-50)
      .map((m) => `${m.message_type === 0 ? "Cliente" : "Equipo"}: ${m.content}`)
      .join("\n");
    if (!transcript) return;

    const prev = await getExtraction(link.id);
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

    // Merge incremental: lo manual manda; lo demás se actualiza si cambió.
    const now = new Date().toISOString();
    const data = { ...prev.data };
    const provenance = { ...prev.provenance };
    let changed = false;
    for (const [key, value] of Object.entries(extracted)) {
      if (prev.manualKeys.includes(key)) continue; // P: no pisar ediciones humanas.
      if (JSON.stringify(data[key]) === JSON.stringify(value)) continue;
      data[key] = value;
      provenance[key] = { source: "bot", at: now };
      changed = true;
    }
    if (!changed) return;

    await upsert(link, bot, data, prev.manualKeys, provenance);
  } catch (e) {
    // Datos previos intactos; la próxima ráfaga/consolidación reintenta.
    console.warn(
      `[extraction] fallo en convo ${convo.id}:`,
      e instanceof Error ? e.message : e,
    );
  }
}

async function upsert(
  link: ChannelLinkRow,
  bot: BotRow,
  data: Record<string, unknown>,
  manualKeys: string[],
  provenance: Extraction["provenance"],
): Promise<ExtractedDataRow> {
  const values = {
    channelLinkId: link.id,
    tenantId: link.tenantId,
    botId: bot.id,
    data,
    manualKeys,
    provenance,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(extractedData)
    .values(values)
    .onConflictDoUpdate({ target: extractedData.channelLinkId, set: values })
    .returning();
  return row!;
}
