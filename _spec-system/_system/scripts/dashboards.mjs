#!/usr/bin/env node
// Actualiza el bloque auto-generado de cada archivo en epics/ y cycles/ con la
// tabla de historias relacionadas + resumen por estado. El bloque está
// delimitado por marcadores HTML; el resto del contenido manual no se toca.
//
//   <!-- DASHBOARD:START — no editar -->
//   ...contenido generado...
//   <!-- DASHBOARD:END -->
//
// Si los marcadores no existen, se agregan al final del archivo.

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const STORIES_DIR = join(ROOT, "stories");
const EPICS_DIR = join(ROOT, "epics");
const CYCLES_DIR = join(ROOT, "cycles");

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

const START = "<!-- DASHBOARD:START — auto-generado por _system/scripts/dashboards.mjs, no editar a mano -->";
const END = "<!-- DASHBOARD:END -->";

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

async function loadStories() {
  const items = await safeReaddir(STORIES_DIR);
  const out = [];
  for (const it of items) {
    if (!it.isDirectory()) continue;
    if (it.name.startsWith("_") || it.name.startsWith(".")) continue;
    const indexPath = join(STORIES_DIR, it.name, "index.md");
    try {
      await stat(indexPath);
    } catch {
      continue;
    }
    const fm = parseFrontmatter(await readFile(indexPath, "utf8"));
    if (fm?.id) out.push(fm);
  }
  return out;
}

async function listMdFiles(dir) {
  const items = await safeReaddir(dir);
  return items
    .filter((it) => it.isFile() && it.name.endsWith(".md") && it.name !== "README.md")
    .map((it) => join(dir, it.name));
}

function renderTable(rows, columns) {
  if (rows.length === 0) return "_(sin historias relacionadas)_";
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${columns.map((c) => r[c.key] ?? "").join(" | ")} |`).join("\n");
  return `${header}\n${sep}\n${body}`;
}

function statusSummary(stories) {
  if (stories.length === 0) return "";
  const counts = Object.fromEntries(STORY_STATUSES.map((s) => [s, 0]));
  for (const s of stories) counts[s.status] = (counts[s.status] ?? 0) + 1;
  const present = STORY_STATUSES.filter((s) => counts[s] > 0).map((s) => `${s}: ${counts[s]}`);
  const total = stories.length;
  const done = counts["En producción"] || 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return `**Progreso:** ${done}/${total} en producción (${pct}%) · ${present.join(" · ")}`;
}

function renderEpicDashboard(epic, stories) {
  const sorted = stories.filter((s) => s.epic === epic.id).sort((a, b) => (a.id || "").localeCompare(b.id || ""));
  const rows = sorted.map((s) => ({
    ID: `[${s.id}](../stories/${findSlug(s.id)}/index.md)`,
    Titulo: s.title || "",
    Ciclo: s.cycle || "—",
    Estado: s.status || "",
    Prioridad: s.priority || "",
  }));
  return [
    START,
    "",
    `## Historias de la épica (${sorted.length})`,
    "",
    statusSummary(sorted),
    "",
    renderTable(rows, [
      { key: "ID", label: "ID" },
      { key: "Titulo", label: "Título" },
      { key: "Ciclo", label: "Ciclo" },
      { key: "Estado", label: "Estado" },
      { key: "Prioridad", label: "Prioridad" },
    ]),
    "",
    END,
  ].join("\n");
}

function renderCycleDashboard(cycle, stories) {
  const sorted = stories.filter((s) => s.cycle === cycle.id).sort((a, b) => (a.id || "").localeCompare(b.id || ""));
  const rows = sorted.map((s) => ({
    ID: `[${s.id}](../stories/${findSlug(s.id)}/index.md)`,
    Titulo: s.title || "",
    Epica: s.epic || "",
    Estado: s.status || "",
    Prioridad: s.priority || "",
  }));
  return [
    START,
    "",
    `## Historias inscritas (${sorted.length})`,
    "",
    statusSummary(sorted),
    "",
    renderTable(rows, [
      { key: "ID", label: "ID" },
      { key: "Titulo", label: "Título" },
      { key: "Epica", label: "Épica" },
      { key: "Estado", label: "Estado" },
      { key: "Prioridad", label: "Prioridad" },
    ]),
    "",
    END,
  ].join("\n");
}

// Mapa US-00X → slug-de-carpeta. Lo construimos una vez al inicio.
const SLUG_BY_ID = new Map();
function findSlug(id) {
  return SLUG_BY_ID.get(id) || "";
}

async function buildSlugMap() {
  const items = await safeReaddir(STORIES_DIR);
  for (const it of items) {
    if (!it.isDirectory()) continue;
    if (it.name.startsWith("_") || it.name.startsWith(".")) continue;
    const indexPath = join(STORIES_DIR, it.name, "index.md");
    try {
      await stat(indexPath);
    } catch {
      continue;
    }
    const fm = parseFrontmatter(await readFile(indexPath, "utf8"));
    if (fm?.id) SLUG_BY_ID.set(fm.id, it.name);
  }
}

function upsertBlock(text, block) {
  const re = new RegExp(`${escapeRegExp(START)}[\\s\\S]*?${escapeRegExp(END)}`);
  if (re.test(text)) return text.replace(re, block);
  return `${text.replace(/\s+$/, "")}\n\n${block}\n`;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function processFile(path, renderFn) {
  const original = await readFile(path, "utf8");
  const fm = parseFrontmatter(original);
  if (!fm?.id) {
    console.warn(`! ${path}: sin id, se omite`);
    return false;
  }
  const block = renderFn(fm);
  const updated = upsertBlock(original, block);
  if (updated === original) return false;
  await writeFile(path, updated);
  return true;
}

await buildSlugMap();
const stories = await loadStories();
const epicFiles = await listMdFiles(EPICS_DIR);
const cycleFiles = await listMdFiles(CYCLES_DIR);

let touched = 0;
for (const f of epicFiles) {
  if (await processFile(f, (epic) => renderEpicDashboard(epic, stories))) touched++;
}
for (const f of cycleFiles) {
  if (await processFile(f, (cycle) => renderCycleDashboard(cycle, stories))) touched++;
}

console.log(`✓ Dashboards actualizados · ${epicFiles.length} épicas + ${cycleFiles.length} ciclos · ${touched} archivos modificados`);
