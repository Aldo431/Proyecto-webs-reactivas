import {
  orderListSchema,
  orderSchema,
  type CartLine,
  type Order,
} from "@tiendadcc/utils";
import { z } from "zod";
import { apiBaseUrl } from "./env.ts";

export type OrderFailure = {
  ok: false;
  message: string;
};

export type CreateOrderResult = { ok: true; order: Order } | OrderFailure;

export type OrdersResult = { ok: true; orders: Order[] } | OrderFailure;

interface ApiErrorBody {
  message?: string;
}

const UNEXPECTED_RESPONSE = "El servidor devolvió una respuesta inesperada.";

// Mensajes en español por estado cuando el cuerpo de error no trae uno.
const STATUS_MESSAGES: Record<number, string> = {
  400: "Revisa los datos ingresados.",
  401: "Debes iniciar sesión.",
  409: "No se pudo procesar el pedido. Inténtalo de nuevo.",
  503: "El servicio no está disponible en este momento.",
};

// Prefija la base de la API (`VITE_API_URL` puede no ser vacío) y fija
// `credentials: include` en cada llamada, como reviewApi.ts.
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

function networkFailure(): OrderFailure {
  return {
    ok: false,
    message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
  };
}

async function failureFromStatus(
  response: Response,
  fallbackMessage: string,
): Promise<OrderFailure> {
  const body = await readErrorBody(response);
  return {
    ok: false,
    message:
      body.message ?? STATUS_MESSAGES[response.status] ?? fallbackMessage,
  };
}

async function parseBody<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | OrderFailure> {
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

// Crea el pedido al pagar (spec 012, RF-2, RF-6). Solo viajan identificadores y
// `quantity` por línea (RF-10): ni precios, ni totales, ni ningún dato de
// tarjeta. Devuelve el pedido con folio para la pantalla de éxito (RF-7).
export async function createOrder(
  items: CartLine[],
): Promise<CreateOrderResult> {
  try {
    const response = await fetch(buildUrl("/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        items: items.map((line) => ({
          productId: line.productId,
          ...(line.variantId === undefined ? {} : { variantId: line.variantId }),
          quantity: line.quantity,
        })),
      }),
    });
    if (response.status === 201) {
      const parsed = await parseBody(response, orderSchema);
      return parsed.ok ? { ok: true, order: parsed.data } : parsed;
    }
    return failureFromStatus(
      response,
      "No pudimos registrar tu pedido. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}

// Pedidos del perfil (spec 012, RF-1, RF-9): solo los de la sesión, del más
// reciente al más antiguo.
export async function fetchOrders(): Promise<OrdersResult> {
  try {
    const response = await fetch(buildUrl("/orders"), {
      method: "GET",
      credentials: "include",
    });
    if (response.status === 200) {
      const parsed = await parseBody(response, orderListSchema);
      return parsed.ok ? { ok: true, orders: parsed.data } : parsed;
    }
    return failureFromStatus(
      response,
      "No se pudieron cargar tus pedidos. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}
