/**
 * Extracción de información estructurada (E12).
 *
 * El esquema de extracción de un bot es un subset de JSON Schema: un objeto
 * raíz `{ type: "object", properties: {...}, required?: [...] }` cuyas
 * propiedades son de tipo string | number | boolean | enum (de strings) |
 * array de strings. Suficiente para capturar datos de negocio sin arrastrar
 * un validador completo (ajv) a ambos lados.
 */

export type ExtractionFieldType = "string" | "number" | "boolean" | "array";

export type ExtractionField = {
  type: ExtractionFieldType;
  description?: string;
  enum?: string[];
};

export type ExtractionSchema = {
  type: "object";
  properties: Record<string, ExtractionField>;
  required?: string[];
};

const FIELD_TYPES: ExtractionFieldType[] = ["string", "number", "boolean", "array"];
const MAX_FIELDS = 50;
const KEY_RE = /^[a-z][a-z0-9_]{0,99}$/;

/**
 * Valida que `schema` sea un esquema de extracción bien formado.
 * Devuelve la lista de errores (vacía = válido).
 */
export function validateExtractionSchema(schema: unknown): string[] {
  const errors: string[] = [];
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return ["El esquema debe ser un objeto JSON"];
  }
  const s = schema as Record<string, unknown>;
  if (s.type !== "object") errors.push('La raíz debe tener "type": "object"');
  const props = s.properties;
  if (typeof props !== "object" || props === null || Array.isArray(props)) {
    errors.push('Falta "properties" (objeto con los campos a extraer)');
    return errors;
  }
  const keys = Object.keys(props as Record<string, unknown>);
  if (keys.length === 0) errors.push("Define al menos un campo en properties");
  if (keys.length > MAX_FIELDS) errors.push(`Máximo ${MAX_FIELDS} campos`);
  for (const key of keys) {
    if (!KEY_RE.test(key)) {
      errors.push(`Clave inválida "${key}" (usa snake_case: letras, números y _)`);
      continue;
    }
    const field = (props as Record<string, unknown>)[key];
    if (typeof field !== "object" || field === null || Array.isArray(field)) {
      errors.push(`"${key}" debe ser un objeto con al menos "type"`);
      continue;
    }
    const f = field as Record<string, unknown>;
    if (!FIELD_TYPES.includes(f.type as ExtractionFieldType)) {
      errors.push(`"${key}.type" debe ser uno de: ${FIELD_TYPES.join(", ")}`);
    }
    if (f.description !== undefined && typeof f.description !== "string") {
      errors.push(`"${key}.description" debe ser string`);
    }
    if (f.enum !== undefined) {
      if (!Array.isArray(f.enum) || f.enum.some((v) => typeof v !== "string") || f.enum.length === 0) {
        errors.push(`"${key}.enum" debe ser un array de strings no vacío`);
      } else if (f.type !== "string") {
        errors.push(`"${key}": enum solo aplica a type "string"`);
      }
    }
  }
  if (s.required !== undefined) {
    if (!Array.isArray(s.required) || s.required.some((v) => typeof v !== "string")) {
      errors.push('"required" debe ser un array de strings');
    } else {
      for (const r of s.required as string[]) {
        if (!keys.includes(r)) errors.push(`"required" referencia un campo inexistente: "${r}"`);
      }
    }
  }
  return errors;
}

function fieldError(key: string, field: ExtractionField, value: unknown): string | null {
  if (value === null) return null; // null = "sin dato", siempre aceptado.
  switch (field.type) {
    case "string":
      if (typeof value !== "string") return `"${key}" debe ser string`;
      if (field.enum && !field.enum.includes(value)) {
        return `"${key}" debe ser uno de: ${field.enum.join(", ")}`;
      }
      return null;
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? null
        : `"${key}" debe ser número`;
    case "boolean":
      return typeof value === "boolean" ? null : `"${key}" debe ser boolean`;
    case "array":
      return Array.isArray(value) && value.every((v) => typeof v === "string")
        ? null
        : `"${key}" debe ser un array de strings`;
  }
}

/**
 * Valida `data` contra un esquema de extracción ya validado.
 * Devuelve errores (vacía = válido). Claves desconocidas son error: el JSON
 * editado a mano debe ajustarse al esquema del bot.
 */
export function validateDataAgainstSchema(schema: ExtractionSchema, data: unknown): string[] {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return ["Los datos deben ser un objeto JSON"];
  }
  const errors: string[] = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const field = schema.properties[key];
    if (!field) {
      errors.push(`"${key}" no existe en el esquema del bot`);
      continue;
    }
    const err = fieldError(key, field, value);
    if (err) errors.push(err);
  }
  return errors;
}

/**
 * Filtra de `data` las claves/valores que NO cumplen el esquema (para sanear
 * la salida del LLM sin descartar la extracción completa).
 */
export function sanitizeAgainstSchema(
  schema: ExtractionSchema,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const field = schema.properties[key];
    if (!field) continue;
    if (value === null || value === undefined) continue;
    if (fieldError(key, field, value) === null) out[key] = value;
  }
  return out;
}
