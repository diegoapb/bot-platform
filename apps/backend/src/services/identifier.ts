/**
 * Normalización del identificador de contacto (E13/US-033). Lleva el teléfono a
 * E.164 y el email a minúsculas sin espacios, decide si es fiable y produce una
 * forma canónica: dos entradas equivalentes generan el mismo identificador
 * primario (1.1–1.4). Los callers pasan teléfonos/emails ya extraídos del canal
 * (no jids crudos).
 */

export type NormalizedIdentifier =
  | { kind: "phone"; value: string; reliable: true }
  | { kind: "email"; value: string; reliable: true }
  | { kind: "none"; value: null; reliable: false };

const NONE: NormalizedIdentifier = { kind: "none", value: null, reliable: false };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeIdentifier(raw: string | null | undefined): NormalizedIdentifier {
  if (!raw) return NONE;
  const trimmed = raw.trim();
  if (!trimmed) return NONE;

  // Email: lo distinguimos por la '@'. Minúsculas y sin espacios (1.2).
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase().replace(/\s+/g, "");
    return EMAIL_RE.test(email) ? { kind: "email", value: email, reliable: true } : NONE;
  }

  // Teléfono: solo dígitos, 7..15 → E.164 (1.1). Ignora separadores/espacios (1.4).
  const digits = trimmed.replace(/\D/g, "");
  if (/^\d{7,15}$/.test(digits)) return { kind: "phone", value: `+${digits}`, reliable: true };

  return NONE;
}
