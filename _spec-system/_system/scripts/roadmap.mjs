#!/usr/bin/env node
// Genera _spec-system/roadmap.md recorriendo los frontmatters de historias,
// épicas y ciclos. Falla si encuentra un status fuera de la lista cerrada o
// referencias a épicas/ciclos inexistentes.

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// HERE = _spec-system/_system/scripts → ROOT = _spec-system
const ROOT = join(HERE, "..", "..");
const STORIES_DIR = join(ROOT, "stories");
const EPICS_DIR = join(ROOT, "epics");
const CYCLES_DIR = join(ROOT, "cycles");
const OUT_FILE = join(ROOT, "roadmap.md");

const STORY_STATUSES = [
  "Levantamiento de requerimientos",
  "Creación de diseño",
  "Levantamiento de tareas",
  "Pendiente desarrollo",
  "En implementación",
  "Pendiente de pruebas",
  "Probada",
  "En CA",
  "En producción",
];

// --- parser de frontmatter mínimo (key: value plano, soporta null y comillas) ---
function parseFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const obj = {};
  for (const raw of m[1].split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val === "" || val === "null" || val === "~") val = null;
    else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    obj[key] = val;
  }
  return obj;
}

async function safeReaddir(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

async function loadEpics() {
  const items = await safeReaddir(EPICS_DIR);
  const out = new Map();
  for (const it of items) {
    if (!it.isFile() || !it.name.endsWith(".md") || it.name === "README.md") continue;
    const fm = parseFrontmatter(await readFile(join(EPICS_DIR, it.name), "utf8"));
    if (fm?.id) out.set(fm.id, fm);
  }
  return out;
}

async function loadCycles() {
  const items = await safeReaddir(CYCLES_DIR);
  const out = new Map();
  for (const it of items) {
    if (!it.isFile() || !it.name.endsWith(".md") || it.name === "README.md") continue;
    const fm = parseFrontmatter(await readFile(join(CYCLES_DIR, it.name), "utf8"));
    if (fm?.id) out.set(fm.id, fm);
  }
  return out;
}

async function loadStories() {
  const items = await safeReaddir(STORIES_DIR);
  const out = [];
  for (const it of items) {
    if (!it.isDirectory()) continue;
    if (it.name.startsWith("_") || it.name.startsWith(".")) continue; // _templates, _guides, .archive
    const indexPath = join(STORIES_DIR, it.name, "index.md");
    try {
      await stat(indexPath);
    } catch {
      console.warn(`! ${it.name}: falta index.md, se omite`);
      continue;
    }
    const fm = parseFrontmatter(await readFile(indexPath, "utf8"));
    if (!fm?.id) {
      console.warn(`! ${it.name}/index.md: sin frontmatter id`);
      continue;
    }
    out.push(fm);
  }
  return out;
}

function fail(msg) {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
}

function validate(stories, epics, cycles) {
  for (const s of stories) {
    if (!STORY_STATUSES.includes(s.status)) {
      fail(`${s.id}: status "${s.status}" no está en la lista cerrada.`);
    }
    if (!s.epic) fail(`${s.id}: falta el campo epic.`);
    if (!epics.has(s.epic)) fail(`${s.id}: epic "${s.epic}" no existe en epics/.`);
    if (s.cycle && !cycles.has(s.cycle)) {
      fail(`${s.id}: cycle "${s.cycle}" no existe en cycles/.`);
    }
  }
}

function renderTable(rows, columns) {
  if (rows.length === 0) return "_(sin historias)_\n";
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${columns.map((c) => r[c.key] ?? "").join(" | ")} |`).join("\n");
  return `${header}\n${sep}\n${body}\n`;
}

function build(stories, epics, cycles) {
  const sorted = [...stories].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
  const byCycle = new Map();
  const orphans = [];
  for (const s of sorted) {
    if (s.cycle) {
      if (!byCycle.has(s.cycle)) byCycle.set(s.cycle, []);
      byCycle.get(s.cycle).push(s);
    } else {
      orphans.push(s);
    }
  }

  const out = [];
  out.push("# Roadmap");
  out.push("");
  out.push(`> Auto-generado por \`_system/scripts/roadmap.mjs\`. Última actualización: ${new Date().toISOString().slice(0, 10)}.`);
  out.push("> No editar a mano — regenerar con: `node _spec-system/_system/scripts/roadmap.mjs`");
  out.push("");

  // Resumen por estado
  out.push("## Resumen por estado");
  out.push("");
  const counts = Object.fromEntries(STORY_STATUSES.map((s) => [s, 0]));
  for (const s of stories) counts[s.status]++;
  const totalsRows = STORY_STATUSES.map((s) => ({ Estado: s, Conteo: String(counts[s]) }));
  out.push(renderTable(totalsRows, [
    { key: "Estado", label: "Estado" },
    { key: "Conteo", label: "Conteo" },
  ]));

  // Por ciclo
  out.push("## Por ciclo");
  out.push("");
  const cycleIds = [...cycles.keys()].sort();
  for (const cid of cycleIds) {
    const c = cycles.get(cid);
    const range = c.start && c.end ? ` (${c.start} → ${c.end})` : "";
    out.push(`### ${cid} — ${c.name || ""}${range}`);
    if (c.goal) out.push(`\n_${c.goal}_\n`);
    const rows = (byCycle.get(cid) || []).map((s) => ({
      ID: s.id,
      Titulo: s.title || "",
      Epica: s.epic || "",
      Estado: s.status || "",
      Prioridad: s.priority || "",
    }));
    out.push(renderTable(rows, [
      { key: "ID", label: "ID" },
      { key: "Titulo", label: "Título" },
      { key: "Epica", label: "Épica" },
      { key: "Estado", label: "Estado" },
      { key: "Prioridad", label: "Prioridad" },
    ]));
  }
  if (cycleIds.length === 0) out.push("_(sin ciclos definidos)_\n");

  // Backlog (sin ciclo)
  out.push("## Backlog (sin ciclo)");
  out.push("");
  const orphRows = orphans.map((s) => ({
    ID: s.id,
    Titulo: s.title || "",
    Epica: s.epic || "",
    Estado: s.status || "",
    Prioridad: s.priority || "",
  }));
  out.push(renderTable(orphRows, [
    { key: "ID", label: "ID" },
    { key: "Titulo", label: "Título" },
    { key: "Epica", label: "Épica" },
    { key: "Estado", label: "Estado" },
    { key: "Prioridad", label: "Prioridad" },
  ]));

  // Por épica
  out.push("## Por épica");
  out.push("");
  const epicIds = [...epics.keys()].sort();
  for (const eid of epicIds) {
    const e = epics.get(eid);
    out.push(`### ${eid} — ${e.title || ""}  · _${e.status || ""}_`);
    const rows = sorted.filter((s) => s.epic === eid).map((s) => ({
      ID: s.id,
      Titulo: s.title || "",
      Ciclo: s.cycle || "—",
      Estado: s.status || "",
    }));
    out.push(renderTable(rows, [
      { key: "ID", label: "ID" },
      { key: "Titulo", label: "Título" },
      { key: "Ciclo", label: "Ciclo" },
      { key: "Estado", label: "Estado" },
    ]));
  }
  if (epicIds.length === 0) out.push("_(sin épicas definidas)_\n");

  return out.join("\n");
}

const [epics, cycles, stories] = await Promise.all([loadEpics(), loadCycles(), loadStories()]);
validate(stories, epics, cycles);
const content = build(stories, epics, cycles);
await writeFile(OUT_FILE, content);
console.log(`✓ roadmap.md regenerado · ${stories.length} historias · ${epics.size} épicas · ${cycles.size} ciclos`);
