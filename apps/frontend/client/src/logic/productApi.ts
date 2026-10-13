import {
  MAX_IDS_PER_QUERY,
  productListSchema,
  productSchema,
  type CreateProductInput,
  type Product,
  type ProductCategory,
  type UpdateProductInput,
} from "@tiendadcc/utils";
import { z } from "zod";
import { apiBaseUrl } from "./env.ts";

export type ProductFailure = {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
  // Solo en respuestas 404: permite distinguir "no existe" de un error de red.
  notFound?: true;
};

export type ProductListResult =
  | { ok: true; products: Product[] }
  | ProductFailure;

export type ProductResult = { ok: true; product: Product } | ProductFailure;

export type DeleteProductResult = { ok: true } | ProductFailure;

export interface ProductFilters {
  categoria?: ProductCategory;
  featured?: boolean;
}

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
  404: "Producto no encontrado.",
  413: "Los datos enviados superan el tamaño máximo permitido.",
};

// Con "credentials: include" la cookie httpOnly viaja en cada llamada, igual
// que en authApi.ts y profileApi.ts.
function buildUrl(path: string): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  return `${base}/api/products${path}`;
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

function networkFailure(): ProductFailure {
  return {
    ok: false,
    message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
  };
}

async function failureFromStatus(
  response: Response,
  fallbackMessage: string,
): Promise<ProductFailure> {
  const body = await readErrorBody(response);
  const failure: ProductFailure = {
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
): Promise<{ ok: true; data: T } | ProductFailure> {
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

async function readList(
  path: string,
  fallbackMessage: string,
): Promise<ProductListResult> {
  try {
    const response = await fetch(buildUrl(path), {
      method: "GET",
      credentials: "include",
    });
    if (response.status === 200) {
      const parsed = await parseBody(response, productListSchema);
      return parsed.ok ? { ok: true, products: parsed.data } : parsed;
    }
    return failureFromStatus(response, fallbackMessage);
  } catch {
    return networkFailure();
  }
}

async function sendProduct(
  path: string,
  init: RequestInit,
  expectedStatus: number,
  fallbackMessage: string,
): Promise<ProductResult> {
  try {
    const response = await fetch(buildUrl(path), {
      ...init,
      credentials: "include",
    });
    if (response.status === expectedStatus) {
      const parsed = await parseBody(response, productSchema);
      return parsed.ok ? { ok: true, product: parsed.data } : parsed;
    }
    return failureFromStatus(response, fallbackMessage);
  } catch {
    return networkFailure();
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// Listado público con filtros combinables (spec 008, RF-5). Sin filtros trae
// todo el catálogo.
export function fetchProducts(
  filters: ProductFilters = {},
): Promise<ProductListResult> {
  const params: string[] = [];
  if (filters.categoria !== undefined) {
    params.push(`categoria=${encodeURIComponent(filters.categoria)}`);
  }
  if (filters.featured !== undefined) {
    params.push(`featured=${String(filters.featured)}`);
  }
  const query = params.length > 0 ? `?${params.join("&")}` : "";
  return readList(query, "No se pudieron cargar los productos.");
}

// Resuelve ids guardados (carrito, favoritos, historial) contra el backend.
// Los que ya no existen simplemente no vuelven en la lista. Parte la consulta
// en lotes del tope del servidor y conserva el orden pedido.
export async function fetchProductsByIds(
  ids: readonly string[],
): Promise<ProductListResult> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) {
    return { ok: true, products: [] };
  }

  const batches: string[][] = [];
  for (let start = 0; start < unique.length; start += MAX_IDS_PER_QUERY) {
    batches.push(unique.slice(start, start + MAX_IDS_PER_QUERY));
  }

  const results = await Promise.all(
    batches.map((batch) =>
      readList(
        `?ids=${batch.map(encodeURIComponent).join(",")}`,
        "No se pudieron cargar los productos.",
      ),
    ),
  );

  const products: Product[] = [];
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    products.push(...result.products);
  }
  return { ok: true, products };
}

export function fetchProduct(id: string): Promise<ProductResult> {
  return sendProduct(
    `/${encodeURIComponent(id)}`,
    { method: "GET" },
    200,
    "No se pudo cargar el producto.",
  );
}

export async function fetchMyProducts(): Promise<ProductListResult> {
  return readList("/mine", "No se pudieron cargar tus publicaciones.");
}

export function createProduct(
  input: CreateProductInput,
): Promise<ProductResult> {
  return sendProduct(
    "",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        category: input.category,
        price: input.price,
        image: input.image,
      }),
    },
    201,
    "No se pudo publicar el producto. Inténtalo de nuevo.",
  );
}

export function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductResult> {
  return sendProduct(
    `/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
    200,
    "No se pudieron guardar los cambios. Inténtalo de nuevo.",
  );
}

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  try {
    const response = await fetch(buildUrl(`/${encodeURIComponent(id)}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (response.status === 204) {
      return { ok: true };
    }
    return failureFromStatus(
      response,
      "No se pudo eliminar la publicación. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}
