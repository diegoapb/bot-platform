/**
 * Chunking de texto para la base de conocimiento (US-009).
 * Split por párrafos con target ~500 tokens (≈4 chars/token → 2000 chars) y
 * solape de ~50 tokens entre chunks. Las FAQs se indexan como 1 solo chunk.
 */

const TARGET_CHARS = 2000;
const OVERLAP_CHARS = 200;

/** Divide un texto en chunks por párrafos, partiendo párrafos gigantes. */
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  // Párrafos; los que excedan el target se parten por oraciones/longitud.
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length <= TARGET_CHARS ? [p] : splitLong(p)));

  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length + 2 > TARGET_CHARS) {
      chunks.push(current);
      // Solape: arrastra la cola del chunk anterior para no perder contexto.
      current = current.slice(-OVERLAP_CHARS) + "\n\n" + p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

/** Parte un párrafo más largo que el target por oraciones (o duro si hace falta). */
function splitLong(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [paragraph];
  const parts: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (s.length > TARGET_CHARS) {
      if (current) {
        parts.push(current);
        current = "";
      }
      for (let i = 0; i < s.length; i += TARGET_CHARS) {
        parts.push(s.slice(i, i + TARGET_CHARS));
      }
      continue;
    }
    if (current && current.length + s.length > TARGET_CHARS) {
      parts.push(current);
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Una FAQ es un único chunk pregunta+respuesta. */
export function faqChunk(question: string, answer: string): string {
  return `Pregunta: ${question}\nRespuesta: ${answer}`;
}
