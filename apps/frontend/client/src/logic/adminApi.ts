import {
  adminOverviewSchema,
  adminPageSchema,
  adminProductSchema,
  adminReviewSchema,
  adminUserSchema,
  type AdminOverview,
  type AdminPage,
  type AdminProduct,
  type AdminReview,
  type AdminUser,
  type UserRole,
} from "@tiendadcc/utils";
import { z } from "zod";
import {
  buildAdminProductsParams,
  buildAdminReviewsParams,
  buildAdminUsersParams,
  type AdminProductsQuery,
  type AdminReviewsQuery,
  type AdminUsersQuery,
} from "./adminQuery.ts";
import { apiBaseUrl } from "./env.ts";

// Cliente de la API del panel de administración (spec 013). Los componentes
// no llaman a `fetch`: usan estas funciones (constitución §3). Mismo patrón
// que reviewApi.ts: `credentials: include`, respuesta validada con Zod y un
// resultado discriminado con mensaje en español.

export type AdminFailure = {
  ok: false;
  message: string;
  /** Estado HTTP; `null` si no hubo respuesta válida (red o cuerpo inesperado). */
  status: number | null;
};

export type AdminResult<T> = { ok: true; data: T } | AdminFailure;
export type AdminActionResult = { ok: true } | AdminFailure;

interface ApiErrorBody {
  message?: string;
}

const UNEXPECTED_RESPONSE = "El servidor devolvió una respuesta inesperada.";
const NETWORK_MESSAGE =
  "No se pudo conectar con el servidor. Inténtalo de nuevo.";

// Mensajes por estado cuando el cuerpo de error no trae uno (p. ej. un 502 de
// un proxy que responde HTML).
const STATUS_MESSAGES: Record<number, string> = {
  400: "Revisa los datos ingresados.",
  401: "Debes iniciar sesión.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No se encontró el elemento.",
};

const JSON_HEADERS = { "Content-Type": "application/json" };

const productPageSchema = adminPageSchema(adminProductSchema);
const userPageSchema = adminPageSchema(adminUserSchema);
const reviewPageSchema = adminPageSchema(adminReviewSchema);

function buildUrl(path: string, params?: URLSearchParams): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  const query = params !== undefined && params.size > 0 ? `?${params}` : "";
  return `${base}/api/admin${path}${query}`;
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

async function failureFromStatus(
  response: Response,
  fallbackMessage: string,
): Promise<AdminFailure> {
  const body = await readErrorBody(response);
  return {
    ok: false,
    message:
      body.message ?? STATUS_MESSAGES[response.status] ?? fallbackMessage,
    status: response.status,
  };
}

// Envía la solicitud y devuelve la respuesta si tiene el estado esperado, o
// el fallo traducido a español.
async function send(
  url: string,
  init: RequestInit,
  expectedStatus: number,
  fallbackMessage: string,
): Promise<{ ok: true; response: Response } | AdminFailure> {
  try {
    const response = await fetch(url, { ...init, credentials: "include" });
    if (response.status === expectedStatus) {
      return { ok: true, response };
    }
    return await failureFromStatus(response, fallbackMessage);
  } catch {
    return { ok: false, message: NETWORK_MESSAGE, status: null };
  }
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  expectedStatus: number,
  schema: z.ZodType<T>,
  fallbackMessage: string,
): Promise<AdminResult<T>> {
  const sent = await send(url, init, expectedStatus, fallbackMessage);
  if (!sent.ok) {
    return sent;
  }
  try {
    const parsed = schema.safeParse(await sent.response.json());
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
  } catch {
    // Cuerpo que no es JSON: se informa como respuesta inesperada.
  }
  return { ok: false, message: UNEXPECTED_RESPONSE, status: null };
}

async function requestNoContent(
  url: string,
  fallbackMessage: string,
): Promise<AdminActionResult> {
  const sent = await send(url, { method: "DELETE" }, 204, fallbackMessage);
  return sent.ok ? { ok: true } : sent;
}

const id = encodeURIComponent;

export function fetchAdminOverview(): Promise<AdminResult<AdminOverview>> {
  return requestJson(
    buildUrl("/overview"),
    { method: "GET" },
    200,
    adminOverviewSchema,
    "No se pudo cargar el resumen.",
  );
}

export function fetchAdminProducts(
  query: AdminProductsQuery,
): Promise<AdminResult<AdminPage<AdminProduct>>> {
  return requestJson(
    buildUrl("/products", buildAdminProductsParams(query)),
    { method: "GET" },
    200,
    productPageSchema,
    "No se pudieron cargar los productos.",
  );
}

export function setProductFeatured(
  productId: string,
  featured: boolean,
): Promise<AdminResult<AdminProduct>> {
  return requestJson(
    buildUrl(`/products/${id(productId)}/featured`),
    {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ featured }),
    },
    200,
    adminProductSchema,
    "No se pudo cambiar el destacado. Inténtalo de nuevo.",
  );
}

export function deleteAdminProduct(
  productId: string,
): Promise<AdminActionResult> {
  return requestNoContent(
    buildUrl(`/products/${id(productId)}`),
    "No se pudo eliminar la publicación. Inténtalo de nuevo.",
  );
}

export function fetchAdminUsers(
  query: AdminUsersQuery,
): Promise<AdminResult<AdminPage<AdminUser>>> {
  return requestJson(
    buildUrl("/users", buildAdminUsersParams(query)),
    { method: "GET" },
    200,
    userPageSchema,
    "No se pudieron cargar los usuarios.",
  );
}

export function setUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminResult<AdminUser>> {
  return requestJson(
    buildUrl(`/users/${id(userId)}/role`),
    {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ role }),
    },
    200,
    adminUserSchema,
    "No se pudo cambiar el rol. Inténtalo de nuevo.",
  );
}

export function fetchAdminReviews(
  query: AdminReviewsQuery,
): Promise<AdminResult<AdminPage<AdminReview>>> {
  return requestJson(
    buildUrl("/reviews", buildAdminReviewsParams(query)),
    { method: "GET" },
    200,
    reviewPageSchema,
    "No se pudieron cargar las reseñas.",
  );
}

export function deleteAdminReview(
  reviewId: string,
): Promise<AdminActionResult> {
  return requestNoContent(
    buildUrl(`/reviews/${id(reviewId)}`),
    "No se pudo eliminar la reseña. Inténtalo de nuevo.",
  );
}
