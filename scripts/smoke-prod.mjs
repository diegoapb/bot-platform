#!/usr/bin/env node
/**
 * Smoke test post-deploy (US-014 T7). Sin dependencias; ejecutable manual o CI.
 *
 *   node scripts/smoke-prod.mjs --backend https://api.sira.opensolvex.co --frontend https://sira.opensolvex.co
 *
 * Valida:
 *  1. /health responde y reporta checks de db/evolution/chatwoot (P4).
 *  2. El frontend sirve HTML.
 *  3. Los webhooks están montados y rechazan tokens inválidos (401) —
 *     prueba end-to-end de enrutamiento público sin efectos secundarios.
 * Exit code 0 si todo pasa; 1 con el detalle de fallos.
 */

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BACKEND = (arg("backend", process.env.SMOKE_BACKEND_URL) ?? "").replace(/\/$/, "");
const FRONTEND = (arg("frontend", process.env.SMOKE_FRONTEND_URL) ?? "").replace(/\/$/, "");
if (!BACKEND) {
  console.error("Uso: node scripts/smoke-prod.mjs --backend <url> [--frontend <url>]");
  process.exit(1);
}

const failures = [];
const ok = (name) => console.log(`  ✓ ${name}`);
const fail = (name, detail) => {
  failures.push(name);
  console.error(`  ✗ ${name}: ${detail}`);
};

async function probe(name, fn) {
  try {
    await fn();
  } catch (e) {
    fail(name, e instanceof Error ? e.message : String(e));
  }
}

console.log(`Smoke contra backend=${BACKEND} frontend=${FRONTEND || "(omitido)"}\n`);

// 1) Health extendido
await probe("health extendido", async () => {
  const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  for (const dep of ["db", "evolution", "chatwoot"]) {
    if (typeof body.checks?.[dep] !== "boolean") {
      throw new Error(`falta check de ${dep} en la respuesta`);
    }
  }
  if (body.status === "ok") ok(`health ok (db+evolution+chatwoot arriba)`);
  else {
    const down = Object.entries(body.checks)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    throw new Error(`status=degraded; caídos: ${down.join(", ")}`);
  }
});

// 2) Frontend servido
if (FRONTEND) {
  await probe("frontend responde", async () => {
    const res = await fetch(FRONTEND, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.toLowerCase().includes("<!doctype html")) throw new Error("no devolvió HTML");
    ok("frontend sirve HTML");
  });
}

// 3) Webhooks montados y protegidos (sin efectos: token inválido → 401)
await probe("webhook evolution protegido", async () => {
  const res = await fetch(`${BACKEND}/webhooks/evolution/smoke-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-token": "invalid-smoke-token" },
    body: JSON.stringify({ event: "smoke" }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status !== 401) throw new Error(`esperaba 401, llegó ${res.status}`);
  ok("evolution webhook rechaza token inválido (401)");
});

await probe("webhook chatwoot protegido", async () => {
  const res = await fetch(
    `${BACKEND}/webhooks/chatwoot/00000000-0000-0000-0000-000000000000?token=invalid`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "smoke" }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (res.status !== 401) throw new Error(`esperaba 401, llegó ${res.status}`);
  ok("chatwoot webhook rechaza token inválido (401)");
});

console.log("");
if (failures.length > 0) {
  console.error(`Smoke FALLÓ (${failures.length}): ${failures.join(" · ")}`);
  process.exit(1);
}
console.log("Smoke OK ✅");
