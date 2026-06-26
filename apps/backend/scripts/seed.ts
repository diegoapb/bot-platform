/**
 * Seed de DESARROLLO — carga data de prueba para ejercitar distintos escenarios
 * del producto (ver docs/LOCAL-DOCKER.md §Data de prueba).
 *
 * Es IDEMPOTENTE: borra primero todo lo de los tenants de prueba y vuelve a
 * insertarlo, así que se puede correr cuantas veces quieras (`make seed`).
 *
 * No depende de `env.ts` (no exige Clerk/Evolution/...): se conecta solo con
 * DATABASE_URL. Embeddings sintéticos → no requiere OpenAI.
 *
 *   pnpm --filter @bot/backend db:seed        # (con DATABASE_URL en el entorno)
 *   make seed                                  # (recomendado, dentro de docker)
 *
 * Escenarios:
 *   A "Acme Tienda"        happy-path completo: 1 bot+agente (WhatsApp Evolution),
 *                          conocimiento (ready/faq/failed), catálogo, contacto con
 *                          conversación en modo bot, memoria, hechos y extracción.
 *   B "Demo Multi-Agente"  2 agentes, 3 canales, ruteo E13, colección compartida
 *                          (referencia viva), contacto unificado en 2 canales y una
 *                          conversación escalada a humano (handoff).
 *   C "Cliente Bloqueado"  tenant con `blocked=true` (gate de plataforma).
 *   D "Nuevo Tenant"       bot+agente en `draft`, sin canales ni conocimiento
 *                          (estados vacíos de la UI).
 */
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { inArray } from "drizzle-orm";
import postgres from "postgres";
import * as s from "../src/db/schema.js";

// Fallback de DATABASE_URL para uso en el host (igual que `pnpm db:migrate`): si
// no viene del entorno, se toma de apps/backend/.env. En docker NO entra aquí
// porque el compose ya inyecta DATABASE_URL apuntando al servicio `db`.
if (!process.env.DATABASE_URL) {
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) {
        process.env.DATABASE_URL = (m[1] ?? "").replace(/^["']|["']$/g, "").trim();
        break;
      }
    }
  } catch {
    // Sin .env: el chequeo de abajo dará el error claro.
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL en el entorno (o en apps/backend/.env).");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(sql, { schema: s });

// --- Identidades de prueba -------------------------------------------------
const USER = "user_seed_admin"; // Clerk user id ficticio (creador de todo)

// Si SEED_PRIMARY_TENANT está seteado, el escenario A se carga bajo ese tenant
// (útil para apuntarlo a tu organización real de Clerk y operar desde la UI).
const T_ACME = process.env.SEED_PRIMARY_TENANT?.trim() || "org_seed_acme";
const T_MULTI = "org_seed_multi";
const T_BLOCKED = "org_seed_blocked";
const T_EMPTY = "org_seed_empty";
const SEED_TENANTS = [T_ACME, T_MULTI, T_BLOCKED, T_EMPTY];
// La limpieza incluye SIEMPRE el "org_seed_acme" por defecto, además del tenant
// primario configurado, para que cambiar SEED_PRIMARY_TENANT no deje un Acme
// huérfano de una corrida anterior.
const CLEANUP_TENANTS = [...new Set(["org_seed_acme", ...SEED_TENANTS])];

// --- Helpers de UUID deterministas (8-4-4-4-12, v4) ------------------------
const mkId = (block: string) => (n: number) =>
  `${block}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = mkId("a0000000");
const B = mkId("b0000000");
const C = mkId("c0000000");
const D = mkId("d0000000");

const now = new Date();
const iso = (offsetMin = 0) => new Date(now.getTime() + offsetMin * 60_000).toISOString();

/**
 * Vector determinista de 1536 dims (dimensión de text-embedding-3-small). No es
 * semántico: solo ejercita el pipeline de retrieval (índice HNSW, distancia
 * coseno) sin necesitar la API de OpenAI.
 */
function fakeEmbedding(seed: number): number[] {
  const v = new Array<number>(1536);
  let x = (seed * 2654435761) % 2147483647;
  if (x <= 0) x += 2147483646;
  for (let i = 0; i < 1536; i++) {
    x = (x * 48271) % 2147483647;
    v[i] = x / 2147483647 - 0.5;
  }
  return v;
}

async function cleanup() {
  // Borrado hijo→padre por tenant (las FKs son ON DELETE CASCADE, pero ser
  // explícitos evita sorpresas de orden y deja la operación 100% idempotente).
  const tables = [
    s.generations,
    s.conversationTransitions,
    s.conversations,
    s.extractedData,
    s.contactFacts,
    s.contactMemories,
    s.processedMessages,
    s.webhookEvents,
    s.channelLinks,
    s.contacts,
    s.agentChannels,
    s.agentKnowledgeCollections,
    s.knowledgeChunks,
    s.knowledgeSources,
    s.knowledgeCollections,
    s.catalogItems,
    s.identityDocuments,
    s.phoneRules,
    s.botStatusTransitions,
    s.botAssignments,
    s.channels,
    s.agents,
    s.bots,
  ] as const;
  for (const t of tables) {
    await db.delete(t).where(inArray((t as any).tenantId, CLEANUP_TENANTS));
  }
  await db.delete(s.tenants).where(inArray(s.tenants.id, CLEANUP_TENANTS));
}

async function seedTenants() {
  await db.insert(s.tenants).values([
    { id: T_ACME, name: "Acme Tienda", blocked: false },
    { id: T_MULTI, name: "Demo Multi-Agente", blocked: false },
    {
      id: T_BLOCKED,
      name: "Cliente Bloqueado",
      blocked: true,
      blockedReason: "Falta de pago (escenario de prueba)",
    },
    { id: T_EMPTY, name: "Nuevo Tenant", blocked: false },
  ]);
}

// === Escenario A: Acme Tienda (happy path completo) ========================
async function seedAcme() {
  const extractionSchema = {
    type: "object",
    properties: {
      nombre: { type: "string" },
      presupuesto: { type: "string" },
      ciudad: { type: "string" },
    },
  } as Record<string, unknown>;

  await db.insert(s.bots).values({
    id: A(1),
    tenantId: T_ACME,
    createdBy: USER,
    name: "Acme WhatsApp",
    channel: "whatsapp",
    status: "active",
    evolutionInstance: "dev-acme-wa",
    connectionStatus: "connected",
    lastConnectedAt: now,
    whitelistEnabled: false,
    extractionSchema,
  });

  await db.insert(s.agents).values({
    id: A(2),
    tenantId: T_ACME,
    createdBy: USER,
    name: "Asistente Acme",
    status: "active",
    model: null, // usa el modelo global (env.LLM_MODEL)
    extractionSchema,
    legacyBotId: A(1),
  });

  await db.insert(s.channels).values({
    id: A(3),
    tenantId: T_ACME,
    botId: A(1),
    type: "whatsapp_evolution",
    status: "connected",
    displayName: "WhatsApp Acme +57 300 000 0001",
    createdBy: USER,
  });

  await db.insert(s.agentChannels).values({
    tenantId: T_ACME,
    agentId: A(2),
    channelId: A(3),
  });

  // Identidad (SOUL / IDENTITY / GUARDRAILS), versión 1.
  await db.insert(s.identityDocuments).values([
    {
      tenantId: T_ACME,
      botId: A(1),
      agentId: A(2),
      type: "SOUL",
      version: 1,
      createdBy: USER,
      content:
        "Eres el asistente de Acme Tienda, una tienda de electrónica. Hablas claro, cálido y resolutivo, tuteando al cliente.",
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      agentId: A(2),
      type: "IDENTITY",
      version: 1,
      createdBy: USER,
      content:
        "Horario: L-V 9:00-18:00. Envíos a toda Colombia en 2-4 días. Métodos de pago: tarjeta, PSE y contra-entrega.",
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      agentId: A(2),
      type: "GUARDRAILS",
      version: 1,
      createdBy: USER,
      content:
        "No prometas descuentos no publicados. No compartas datos de otros clientes. Ante quejas legales, deriva a un humano.",
    },
  ]);

  // Base de conocimiento: colección con 3 fuentes (ready texto, ready faq, failed).
  await db.insert(s.knowledgeCollections).values({
    id: A(4),
    tenantId: T_ACME,
    name: "Políticas y FAQ Acme",
    description: "Envíos, devoluciones y preguntas frecuentes.",
    createdBy: USER,
  });
  await db.insert(s.agentKnowledgeCollections).values({
    tenantId: T_ACME,
    agentId: A(2),
    collectionId: A(4),
  });

  await db.insert(s.knowledgeSources).values([
    {
      id: A(5),
      tenantId: T_ACME,
      botId: A(1),
      collectionId: A(4),
      kind: "text",
      title: "Política de devoluciones",
      status: "ready",
      createdBy: USER,
      rawText:
        "Aceptamos devoluciones dentro de los 30 días posteriores a la compra, con el producto en su empaque original. El reembolso se procesa en 5 a 10 días hábiles.",
    },
    {
      id: A(6),
      tenantId: T_ACME,
      botId: A(1),
      collectionId: A(4),
      kind: "faq",
      title: "FAQ envíos",
      status: "ready",
      createdBy: USER,
      rawText:
        "P: ¿Cuánto tarda el envío? R: Entre 2 y 4 días hábiles. P: ¿Hacen envíos internacionales? R: Por ahora solo dentro de Colombia.",
    },
    {
      id: A(7),
      tenantId: T_ACME,
      botId: A(1),
      collectionId: A(4),
      kind: "file",
      title: "catalogo-2024.pdf",
      status: "failed",
      error: "No se pudo extraer texto del PDF (archivo escaneado sin OCR).",
      createdBy: USER,
      rawText: "",
    },
  ]);

  // Chunks + embeddings sintéticos para las 2 fuentes `ready`.
  await db.insert(s.knowledgeChunks).values([
    {
      tenantId: T_ACME,
      botId: A(1),
      collectionId: A(4),
      sourceId: A(5),
      seq: 0,
      content:
        "Aceptamos devoluciones dentro de los 30 días posteriores a la compra, con el producto en su empaque original.",
      embedding: fakeEmbedding(101),
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      collectionId: A(4),
      sourceId: A(5),
      seq: 1,
      content: "El reembolso se procesa en 5 a 10 días hábiles.",
      embedding: fakeEmbedding(102),
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      collectionId: A(4),
      sourceId: A(6),
      seq: 0,
      content: "El envío tarda entre 2 y 4 días hábiles. Solo enviamos dentro de Colombia.",
      embedding: fakeEmbedding(103),
    },
  ]);

  // Catálogo.
  await db.insert(s.catalogItems).values([
    {
      tenantId: T_ACME,
      botId: A(1),
      name: "Audífonos Bluetooth Acme Pro",
      description: "Cancelación de ruido, 30 h de batería.",
      price: "199900.00",
      currency: "COP",
      availability: "available",
      attributes: { color: "negro", garantia: "12 meses" },
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      name: "Teclado mecánico Acme K2",
      description: "Switches rojos, retroiluminado.",
      price: "289900.00",
      currency: "COP",
      availability: "on_request",
      attributes: { layout: "español", conexion: "USB-C" },
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      name: "Mouse inalámbrico Acme M1",
      description: "Silencioso, 6 botones.",
      price: "89900.00",
      currency: "COP",
      availability: "unavailable",
      attributes: { color: "blanco" },
    },
  ]);

  // Reglas de audiencia (lista negra activa siempre; blanca desactivada).
  await db.insert(s.phoneRules).values([
    {
      tenantId: T_ACME,
      botId: A(1),
      phoneE164: "+573009999999",
      kind: "block",
      note: "Spam reportado",
      createdBy: USER,
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      phoneE164: "+573001112233",
      kind: "allow",
      note: "Cliente VIP",
      createdBy: USER,
    },
  ]);

  await db.insert(s.botStatusTransitions).values({
    tenantId: T_ACME,
    botId: A(1),
    fromStatus: "draft",
    toStatus: "active",
    cause: "panel:user",
    actorId: USER,
  });

  // Contacto + conversación en modo bot, con memoria, hechos y extracción.
  await db.insert(s.contacts).values({
    id: A(8),
    tenantId: T_ACME,
    agentId: A(2),
    primaryIdentifier: "+573001112233",
    displayName: "Juan Pérez",
  });

  await db.insert(s.channelLinks).values({
    id: A(9),
    tenantId: T_ACME,
    botId: A(1),
    channelId: A(3),
    contactId: A(8),
    waJid: "573001112233@s.whatsapp.net",
    phoneE164: "+573001112233",
    cwContactId: 9001,
    cwConversationId: 9101,
  });

  await db.insert(s.conversations).values({
    id: A(10),
    tenantId: T_ACME,
    botId: A(1),
    agentId: A(2),
    channelLinkId: A(9),
    mode: "bot",
    lastMsgAt: now,
  });

  await db.insert(s.generations).values([
    {
      tenantId: T_ACME,
      botId: A(1),
      conversationId: A(10),
      model: "claude-haiku-4-5-20251001",
      prompt: { system: "…", messages: [{ role: "user", content: "¿Cuánto tarda el envío?" }] },
      response: "El envío tarda entre 2 y 4 días hábiles dentro de Colombia.",
      inputTokens: 420,
      outputTokens: 28,
      latencyMs: 1340,
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      conversationId: A(10),
      model: "claude-haiku-4-5-20251001",
      prompt: { system: "…", messages: [{ role: "user", content: "¿Tienen audífonos?" }] },
      response: "Sí, los Audífonos Bluetooth Acme Pro están disponibles por $199.900 COP.",
      inputTokens: 510,
      outputTokens: 33,
      latencyMs: 1520,
    },
  ]);

  await db.insert(s.contactMemories).values({
    channelLinkId: A(9),
    contactId: A(8),
    tenantId: T_ACME,
    botId: A(1),
    summary:
      "Juan Pérez, de Bogotá. Interesado en audífonos y teclado mecánico. Prefiere pago contra-entrega.",
  });

  await db.insert(s.contactFacts).values([
    {
      tenantId: T_ACME,
      botId: A(1),
      contactId: A(8),
      channelLinkId: A(9),
      key: "ciudad",
      value: "Bogotá",
      origin: "bot",
    },
    {
      tenantId: T_ACME,
      botId: A(1),
      contactId: A(8),
      channelLinkId: A(9),
      key: "medio_pago_preferido",
      value: "contra-entrega",
      origin: "human",
      updatedBy: USER,
    },
  ]);

  await db.insert(s.extractedData).values({
    channelLinkId: A(9),
    contactId: A(8),
    tenantId: T_ACME,
    botId: A(1),
    data: { nombre: "Juan Pérez", presupuesto: "500000 COP", ciudad: "Bogotá" },
    manualKeys: ["ciudad"],
    provenance: {
      nombre: { source: "bot", at: iso(-30) },
      presupuesto: { source: "bot", at: iso(-20) },
      ciudad: { source: "human", at: iso(-5) },
    },
  });
}

// === Escenario B: Demo Multi-Agente (ruteo E13) ============================
async function seedMulti() {
  await db.insert(s.bots).values({
    id: B(1),
    tenantId: T_MULTI,
    createdBy: USER,
    name: "Transporte Demo",
    status: "active",
    connectionStatus: "connected",
  });

  await db.insert(s.agents).values([
    { id: B(2), tenantId: T_MULTI, createdBy: USER, name: "Agente Ventas", status: "active" },
    {
      id: B(3),
      tenantId: T_MULTI,
      createdBy: USER,
      name: "Agente Soporte",
      status: "active",
      model: "claude-opus-4-8",
    },
  ]);

  // 3 canales sobre el mismo bot (tipos distintos → ok por unique(bot,type)).
  await db.insert(s.channels).values([
    {
      id: B(4),
      tenantId: T_MULTI,
      botId: B(1),
      type: "telegram",
      displayName: "@ventas_demo_bot",
      createdBy: USER,
    },
    {
      id: B(5),
      tenantId: T_MULTI,
      botId: B(1),
      type: "whatsapp_cloud",
      displayName: "WhatsApp Cloud Ventas",
      createdBy: USER,
    },
    {
      id: B(6),
      tenantId: T_MULTI,
      botId: B(1),
      type: "instagram",
      displayName: "@soporte_demo",
      createdBy: USER,
    },
  ]);

  // Ruteo: Ventas atiende Telegram + WhatsApp Cloud; Soporte atiende Instagram.
  await db.insert(s.agentChannels).values([
    { tenantId: T_MULTI, agentId: B(2), channelId: B(4) },
    { tenantId: T_MULTI, agentId: B(2), channelId: B(5) },
    { tenantId: T_MULTI, agentId: B(3), channelId: B(6) },
  ]);

  await db.insert(s.identityDocuments).values([
    {
      tenantId: T_MULTI,
      agentId: B(2),
      type: "SOUL",
      version: 1,
      createdBy: USER,
      content: "Eres el agente de Ventas: entusiasta, orientado a cerrar la compra.",
    },
    {
      tenantId: T_MULTI,
      agentId: B(3),
      type: "SOUL",
      version: 1,
      createdBy: USER,
      content: "Eres el agente de Soporte: paciente y técnico, resuelves incidencias post-venta.",
    },
  ]);

  // Colección compartida (referencia VIVA): la enlazan AMBOS agentes.
  await db.insert(s.knowledgeCollections).values({
    id: B(7),
    tenantId: T_MULTI,
    name: "Manual de producto (compartido)",
    description: "Conocimiento común a Ventas y Soporte.",
    createdBy: USER,
  });
  await db.insert(s.agentKnowledgeCollections).values([
    { tenantId: T_MULTI, agentId: B(2), collectionId: B(7) },
    { tenantId: T_MULTI, agentId: B(3), collectionId: B(7) },
  ]);
  await db.insert(s.knowledgeSources).values({
    id: B(8),
    tenantId: T_MULTI,
    collectionId: B(7),
    kind: "text",
    title: "Especificaciones del producto",
    status: "ready",
    createdBy: USER,
    rawText:
      "El producto X soporta firmware 2.x, batería de 5000 mAh y garantía de 24 meses. La actualización de firmware se hace desde la app.",
  });
  await db.insert(s.knowledgeChunks).values([
    {
      tenantId: T_MULTI,
      collectionId: B(7),
      sourceId: B(8),
      seq: 0,
      content: "El producto X tiene batería de 5000 mAh y garantía de 24 meses.",
      embedding: fakeEmbedding(201),
    },
    {
      tenantId: T_MULTI,
      collectionId: B(7),
      sourceId: B(8),
      seq: 1,
      content: "La actualización de firmware 2.x se realiza desde la app.",
      embedding: fakeEmbedding(202),
    },
  ]);

  // Contacto de Ventas UNIFICADO en 2 canales (mismo contacto, 2 channel_links).
  await db.insert(s.contacts).values([
    {
      id: B(9),
      tenantId: T_MULTI,
      agentId: B(2),
      primaryIdentifier: "+573002223344",
      displayName: "María Gómez",
    },
    {
      id: B(10),
      tenantId: T_MULTI,
      agentId: B(3),
      primaryIdentifier: "+573004445566",
      displayName: "Carlos Ruiz",
    },
  ]);

  await db.insert(s.channelLinks).values([
    {
      id: B(11),
      tenantId: T_MULTI,
      botId: B(1),
      channelId: B(4),
      contactId: B(9),
      waJid: "cw:tg:5001",
      phoneE164: "+573002223344",
      cwContactId: 5001,
      cwConversationId: 5101,
    },
    {
      id: B(12),
      tenantId: T_MULTI,
      botId: B(1),
      channelId: B(5),
      contactId: B(9),
      waJid: "573002223344@s.whatsapp.net",
      phoneE164: "+573002223344",
      cwContactId: 5002,
      cwConversationId: 5102,
    },
    {
      id: B(13),
      tenantId: T_MULTI,
      botId: B(1),
      channelId: B(6),
      contactId: B(10),
      waJid: "cw:ig:5003",
      phoneE164: "+573004445566",
      cwContactId: 5003,
      cwConversationId: 5103,
    },
  ]);

  // Conversaciones: Ventas (bot) en sus 2 canales; Soporte escalada a humano.
  await db.insert(s.conversations).values([
    {
      id: B(14),
      tenantId: T_MULTI,
      botId: B(1),
      agentId: B(2),
      channelLinkId: B(11),
      mode: "bot",
      lastMsgAt: now,
    },
    {
      id: B(15),
      tenantId: T_MULTI,
      botId: B(1),
      agentId: B(2),
      channelLinkId: B(12),
      mode: "bot",
      lastMsgAt: now,
    },
    {
      id: B(16),
      tenantId: T_MULTI,
      botId: B(1),
      agentId: B(3),
      channelLinkId: B(13),
      mode: "human",
      lastMsgAt: now,
    },
  ]);

  await db.insert(s.conversationTransitions).values({
    tenantId: T_MULTI,
    conversationId: B(16),
    fromMode: "bot",
    toMode: "human",
    cause: "panel:user",
    actorId: USER,
  });

  // Memoria compartida del contacto unificado (una fila por contacto).
  await db.insert(s.contactMemories).values([
    {
      channelLinkId: B(11),
      contactId: B(9),
      tenantId: T_MULTI,
      botId: B(1),
      summary: "María Gómez escribe por Telegram y WhatsApp. Compró el producto X, pide accesorios.",
    },
    {
      channelLinkId: B(13),
      contactId: B(10),
      tenantId: T_MULTI,
      botId: B(1),
      summary: "Carlos Ruiz reporta falla de batería. Caso en soporte humano.",
    },
  ]);
}

// === Escenario C: Cliente Bloqueado ========================================
async function seedBlocked() {
  await db.insert(s.bots).values({
    id: C(1),
    tenantId: T_BLOCKED,
    createdBy: USER,
    name: "Bot del cliente bloqueado",
    status: "active",
    connectionStatus: "connected",
  });
  await db.insert(s.agents).values({
    id: C(2),
    tenantId: T_BLOCKED,
    createdBy: USER,
    name: "Agente bloqueado",
    status: "active",
  });
  await db.insert(s.channels).values({
    id: C(3),
    tenantId: T_BLOCKED,
    botId: C(1),
    type: "whatsapp_evolution",
    displayName: "WhatsApp bloqueado",
    createdBy: USER,
  });
  await db.insert(s.agentChannels).values({
    tenantId: T_BLOCKED,
    agentId: C(2),
    channelId: C(3),
  });
}

// === Escenario D: Nuevo Tenant (estados vacíos / draft) ====================
async function seedEmpty() {
  await db.insert(s.bots).values({
    id: D(1),
    tenantId: T_EMPTY,
    createdBy: USER,
    name: "Mi primer bot",
    status: "draft",
    connectionStatus: "disconnected",
  });
  await db.insert(s.agents).values({
    id: D(2),
    tenantId: T_EMPTY,
    createdBy: USER,
    name: "Mi primer agente",
    status: "draft",
  });
}

async function main() {
  console.log("🌱 Cargando data de prueba…");
  console.log(`   tenants: ${SEED_TENANTS.join(", ")}`);
  // Sin transacción envolvente: con un pool de 1 conexión, abrir una transacción
  // y luego operar sobre `db` se bloquearía. El cleanup inicial ya hace la carga
  // idempotente (borra y reinserta), así que basta con correr en secuencia.
  await cleanup();
  await seedTenants();
  await seedAcme();
  await seedMulti();
  await seedBlocked();
  await seedEmpty();
  console.log("✅ Data de prueba cargada:");
  console.log("   • Acme Tienda        → bot+agente WhatsApp, conocimiento, catálogo, conversación");
  console.log("   • Demo Multi-Agente  → 2 agentes, 3 canales, colección compartida, handoff");
  console.log("   • Cliente Bloqueado  → tenant blocked=true");
  console.log("   • Nuevo Tenant       → bot+agente en draft (estados vacíos)");
  if (process.env.SEED_PRIMARY_TENANT?.trim()) {
    console.log(`   ⓘ Escenario Acme cargado bajo tenant: ${T_ACME}`);
  }
}

main()
  .then(() => sql.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("❌ Error al cargar la data de prueba:", err);
    await sql.end().catch(() => {});
    process.exit(1);
  });
