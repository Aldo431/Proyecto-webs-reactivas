/*
 * Origen: código propio de tiendaDCC.
 * Convierte un `ZodError` en el primer mensaje en español por campo (RF-7).
 */
import type { ZodError } from "zod";

export function issuesToFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const [first] = issue.path;
    if (typeof first === "string" && fieldErrors[first] === undefined) {
      fieldErrors[first] = issue.message;
    }
  }
  return fieldErrors;
}
