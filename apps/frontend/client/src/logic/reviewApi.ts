import {
  reviewListSchema,
  reviewSchema,
  type CreateReviewInput,
  type Review,
  type ReviewList,
  type UpdateReviewInput,
} from "@tiendadcc/utils";
import { z } from "zod";
import { apiBaseUrl } from "./env.ts";

export type ReviewFailure = {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
  // Solo en respuestas 404: permite distinguir "no existe" de un error de red.
  notFound?: true;
};

export type ReviewListResult = { ok: true; list: ReviewList } | ReviewFailure;

export type ReviewResult = { ok: true; review: Review } | ReviewFailure;

export type DeleteReviewResult = { ok: true } | ReviewFailure;

interface ApiErrorBody {
  message?: string;
  fieldErrors?: Record<string, string>;
}

const UNEXPECTED_RESPONSE = "El servidor devolvió una respuesta inesperada.";

// Mensajes en español por estado cuando el cuerpo de error no trae uno (por
// ejemplo, un 413 de un proxy que responde HTML).
const STATUS_MESSAGES: Record<number, string> = {
  400: "Revisa los datos ingresados.",
  401: "Debes iniciar sesión.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No se encontró la reseña.",
  409: "Ya has reseñado este producto.",
};

// Prefija la base de la API (`VITE_API_URL` puede no ser vacío) y fija
// `credentials: include` en cada llamada, como productApi.ts.
function buildUrl(path: string): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  return `${base}/api${path}`;
}

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      return body as ApiErrorBody;
    }
  } catch {
    // Respuesta sin cuerpo JSON: se usa el mensaje del estado.
  }
  return {};
}

function networkFailure(): ReviewFailure {
  return {
    ok: false,
    message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
  };
}

async function failureFromStatus(
  response: Response,
  fallbackMessage: string,
): Promise<ReviewFailure> {
  const body = await readErrorBody(response);
  const failure: ReviewFailure = {
    ok: false,
    message:
      body.message ?? STATUS_MESSAGES[response.status] ?? fallbackMessage,
  };
  if (response.status === 400 && body.fieldErrors) {
    failure.fieldErrors = body.fieldErrors;
  }
  if (response.status === 404) {
    failure.notFound = true;
  }
  return failure;
}

async function parseBody<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | ReviewFailure> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, message: UNEXPECTED_RESPONSE };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, message: UNEXPECTED_RESPONSE };
  }
  return { ok: true, data: parsed.data };
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// Listado público con resumen (spec 010, RF-1).
export async function fetchReviews(
  productId: string,
): Promise<ReviewListResult> {
  try {
    const response = await fetch(
      buildUrl(`/products/${encodeURIComponent(productId)}/reviews`),
      { method: "GET", credentials: "include" },
    );
    if (response.status === 200) {
      const parsed = await parseBody(response, reviewListSchema);
      return parsed.ok ? { ok: true, list: parsed.data } : parsed;
    }
    return failureFromStatus(response, "No se pudieron cargar las reseñas.");
  } catch {
    return networkFailure();
  }
}

async function sendReview(
  path: string,
  init: RequestInit,
  expectedStatus: number,
  fallbackMessage: string,
): Promise<ReviewResult> {
  try {
    const response = await fetch(buildUrl(path), {
      ...init,
      credentials: "include",
    });
    if (response.status === expectedStatus) {
      const parsed = await parseBody(response, reviewSchema);
      return parsed.ok ? { ok: true, review: parsed.data } : parsed;
    }
    return failureFromStatus(response, fallbackMessage);
  } catch {
    return networkFailure();
  }
}

export function createReview(
  productId: string,
  input: CreateReviewInput,
): Promise<ReviewResult> {
  return sendReview(
    `/products/${encodeURIComponent(productId)}/reviews`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
    201,
    "No se pudo publicar la reseña. Inténtalo de nuevo.",
  );
}

export function updateReview(
  reviewId: string,
  input: UpdateReviewInput,
): Promise<ReviewResult> {
  return sendReview(
    `/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
    200,
    "No se pudieron guardar los cambios. Inténtalo de nuevo.",
  );
}

export async function deleteReview(
  reviewId: string,
): Promise<DeleteReviewResult> {
  try {
    const response = await fetch(
      buildUrl(`/reviews/${encodeURIComponent(reviewId)}`),
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (response.status === 204) {
      return { ok: true };
    }
    return failureFromStatus(
      response,
      "No se pudo eliminar la reseña. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}
