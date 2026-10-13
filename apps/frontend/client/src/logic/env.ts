import { z } from "zod";

const apiUrlSchema = z
  .string({
    error: "VITE_API_URL debe ser una URL válida o estar vacía.",
  })
  .trim()
  .default("")
  .refine(
    (value) => value === "" || canParseUrl(value),
    "VITE_API_URL debe ser una URL válida o estar vacía.",
  );

function canParseUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export type ApiUrlParseResult =
  | { success: true; apiUrl: string }
  | { success: false; message: string };

export function parseApiUrl(raw: unknown): ApiUrlParseResult {
  const result = apiUrlSchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("\n");
    return { success: false, message };
  }
  return { success: true, apiUrl: result.data };
}

const parsedApiUrl = parseApiUrl(import.meta.env.VITE_API_URL);

if (!parsedApiUrl.success) {
  throw new Error(
    `Configuración de entorno inválida:\n${parsedApiUrl.message}`,
  );
}

// URL base del backend. Vacía ("") indica el mismo origen: Vite proxya /api en
// desarrollo (vite.config.ts) para que la cookie de sesión sea del mismo sitio.
export const apiBaseUrl: string = parsedApiUrl.apiUrl;