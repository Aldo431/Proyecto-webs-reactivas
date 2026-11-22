import {
  verificationConfirmSchema,
  verificationRequestSchema,
  verificationResponseSchema,
} from "@tiendadcc/utils";
import type { ApiFailure } from "./apiFailure.ts";
import {
  apiPath,
  failureFromIssues,
  failureFromResponse,
  networkFailure,
  unexpectedResponseFailure,
} from "./apiFailure.ts";

export type StudentCodeResult =
  | { ok: true; message: string; devCode?: string }
  | ApiFailure;

const NETWORK_MESSAGE =
  "No se pudo conectar con el servidor. Inténtalo de nuevo.";

function fallbackForRequest(status: number): string {
  if (status === 401) return "Inicia sesión para verificar tu correo.";
  if (status === 429) {
    return "Has excedido el límite de solicitudes. Intenta más tarde.";
  }
  if (status === 503) {
    return "El servicio no está disponible en este momento. Inténtalo más tarde.";
  }
  return "No se pudo enviar el código. Intenta más tarde.";
}

function fallbackForConfirm(status: number): string {
  if (status === 401) return "Inicia sesión para verificar tu correo.";
  if (status === 429) {
    return "Has excedido el límite de solicitudes. Intenta más tarde.";
  }
  if (status === 503) {
    return "El servicio no está disponible en este momento. Inténtalo más tarde.";
  }
  return "No se pudo verificar el código. Intenta más tarde.";
}

function toSuccess(data: {
  message: string;
  devCode?: string | undefined;
}): StudentCodeResult {
  return {
    ok: true,
    message: data.message,
    ...(data.devCode === undefined ? {} : { devCode: data.devCode }),
  };
}

export async function requestStudentCode(email: string): Promise<StudentCodeResult> {
  const input = verificationRequestSchema.safeParse({ email });
  if (!input.success) return failureFromIssues(input.error);

  try {
    const response = await fetch(apiPath("/api/students/verify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input.data),
    });
    if (response.status === 202) {
      const parsed = verificationResponseSchema.safeParse(await response.json());
      return parsed.success ? toSuccess(parsed.data) : unexpectedResponseFailure();
    }
    return failureFromResponse(response, fallbackForRequest(response.status));
  } catch {
    return networkFailure(NETWORK_MESSAGE);
  }
}

export async function confirmStudentCode(code: string): Promise<StudentCodeResult> {
  const input = verificationConfirmSchema.safeParse({ code });
  if (!input.success) return failureFromIssues(input.error);

  try {
    const response = await fetch(apiPath("/api/students/confirm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input.data),
    });
    if (response.status === 200) {
      const parsed = verificationResponseSchema.safeParse(await response.json());
      return parsed.success ? toSuccess(parsed.data) : unexpectedResponseFailure();
    }
    return failureFromResponse(response, fallbackForConfirm(response.status));
  } catch {
    return networkFailure(NETWORK_MESSAGE);
  }
}
