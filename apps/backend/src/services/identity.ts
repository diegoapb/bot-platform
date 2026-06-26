import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { identityDocuments, type IdentityDocumentRow } from "../db/schema.js";
import { IDENTITY_TYPES, type IdentityType } from "@bot/shared";

/**
 * Identidad del agente (E13/US-030): tabla append-only `identity_documents`
 * anclada a `agent_id`. Cada guardado inserta version = max+1 por (agent, type);
 * nada se actualiza ni borra (P2). La vigente es la de mayor versión por (agent,
 * type). Versiones de agentes distintos son independientes (3.5).
 */

export async function getCurrent(
  agentId: string,
): Promise<Record<IdentityType, IdentityDocumentRow | null>> {
  const rows = await db
    .select()
    .from(identityDocuments)
    .where(eq(identityDocuments.agentId, agentId))
    .orderBy(desc(identityDocuments.version));

  const result = Object.fromEntries(IDENTITY_TYPES.map((t) => [t, null])) as Record<
    IdentityType,
    IdentityDocumentRow | null
  >;
  for (const row of rows) {
    if (result[row.type as IdentityType] == null) result[row.type as IdentityType] = row;
  }
  return result;
}

export async function save(
  tenantId: string,
  agentId: string,
  type: IdentityType,
  content: string,
  userId: string,
): Promise<{ version: number }> {
  // Retry ante guardado concurrente: el unique (agent,type,version) detecta la carrera.
  for (let attempt = 0; attempt < 5; attempt++) {
    const [latest] = await db
      .select({ version: identityDocuments.version })
      .from(identityDocuments)
      .where(and(eq(identityDocuments.agentId, agentId), eq(identityDocuments.type, type)))
      .orderBy(desc(identityDocuments.version))
      .limit(1);
    const version = (latest?.version ?? 0) + 1;
    const rows = await db
      .insert(identityDocuments)
      .values({ tenantId, agentId, type, version, content, createdBy: userId })
      .onConflictDoNothing()
      .returning({ version: identityDocuments.version });
    if (rows[0]) return { version: rows[0].version };
  }
  throw new Error("No se pudo guardar la versión (conflicto persistente)");
}

export async function listVersions(
  agentId: string,
  type: IdentityType,
): Promise<Array<Pick<IdentityDocumentRow, "version" | "createdBy" | "createdAt" | "content">>> {
  return db
    .select({
      version: identityDocuments.version,
      createdBy: identityDocuments.createdBy,
      createdAt: identityDocuments.createdAt,
      content: identityDocuments.content,
    })
    .from(identityDocuments)
    .where(and(eq(identityDocuments.agentId, agentId), eq(identityDocuments.type, type)))
    .orderBy(desc(identityDocuments.version));
}

/** Restaurar = insertar una NUEVA versión con el contenido de la versión dada. */
export async function restore(
  tenantId: string,
  agentId: string,
  type: IdentityType,
  version: number,
  userId: string,
): Promise<{ version: number } | null> {
  const [doc] = await db
    .select()
    .from(identityDocuments)
    .where(
      and(
        eq(identityDocuments.agentId, agentId),
        eq(identityDocuments.type, type),
        eq(identityDocuments.version, version),
      ),
    );
  if (!doc) return null;
  return save(tenantId, agentId, type, doc.content, userId);
}

/** Identidad compilada para el motor (E06): docs vigentes en orden fijo. */
export async function compileIdentity(agentId: string): Promise<string> {
  const current = await getCurrent(agentId);
  const parts: string[] = [];
  for (const type of IDENTITY_TYPES) {
    const doc = current[type];
    if (doc && doc.content.trim() !== "") {
      parts.push(`## ${type}\n${doc.content}`);
    }
  }
  return parts.join("\n\n");
}
