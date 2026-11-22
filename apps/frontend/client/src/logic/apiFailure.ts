import { z } from "zod";
import type { ZodError } from "zod";
import { apiBaseUrl } from "./env.ts";

export interface ApiFailure {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

const errorBodySchema = z.object({
  message: z.string().min(1).optional(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
});

export function apiPath(path: string): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function networkFailure(fallback: string): ApiFailure {
  return {
    ok: false,
    message: fallback,
  };
}

export function unexpectedResponseFailure(): ApiFailure {
  return {
    ok: false,
    message: "El servidor devolvió una respuesta inesperada.",
  };
}

export function failureFromIssues(error: ZodError): ApiFailure {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const [field] = issue.path;
    if (typeof field === "string" && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message;
    }
  }
  return {
    ok: false,
    message: Object.values(fieldErrors)[0] ?? "Revisa los datos ingresados.",
    ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
  };
}

export async function failureFromResponse(
  response: Response,
  fallbackMessage: string,
): Promise<ApiFailure> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const parsed = errorBodySchema.safeParse(body);
  const data = parsed.success ? parsed.data : null;
  return {
    ok: false,
    message: data?.message ?? fallbackMessage,
    ...(data?.fieldErrors === undefined ? {} : { fieldErrors: data.fieldErrors }),
  };
}
