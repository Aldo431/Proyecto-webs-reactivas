import {
  cartSchema,
  profileSchema,
  type CartLine,
  type UpdateProfileInput,
  type UserProfile,
} from "@tiendadcc/utils";
import { z } from "zod";
import { apiBaseUrl } from "./env.ts";

export type ProfileFailure = {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type ProfileResult =
  | { ok: true; profile: UserProfile }
  | ProfileFailure;

export type FavoritesResult =
  | { ok: true; favorites: string[] }
  | ProfileFailure;

export type CartResult = { ok: true; cart: CartLine[] } | ProfileFailure;

interface ApiErrorBody {
  message?: string;
  fieldErrors?: Record<string, string>;
}

const favoritesSchema = z.array(z.string());

// Con "credentials: include" la cookie httpOnly viaja en cada llamada, igual
// que en authApi.ts.
function buildUrl(path: string): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  return `${base}/api/users${path}`;
}

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      return body as ApiErrorBody;
    }
  } catch {
    // Respuesta sin cuerpo JSON: se usa el mensaje genérico del estado.
  }
  return {};
}

function networkFailure(): ProfileFailure {
  return {
    ok: false,
    message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
  };
}

async function failureFromStatus(
  response: Response,
  fallbackMessage: string,
): Promise<ProfileFailure> {
  const body = await readErrorBody(response);
  if (response.status === 400) {
    const failure: ProfileFailure = {
      ok: false,
      message: body.message ?? "Revisa los datos ingresados.",
      ...(body.fieldErrors ? { fieldErrors: body.fieldErrors } : {}),
    };
    return failure;
  }
  return {
    ok: false,
    message: body.message ?? fallbackMessage,
  };
}

async function parseBody<T>(
  response: Response,
  schema: z.ZodType<T>,
  fallbackMessage: string,
): Promise<{ ok: true; data: T } | ProfileFailure> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, message: fallbackMessage };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, message: "El servidor devolvió una respuesta inesperada." };
  }
  return { ok: true, data: parsed.data };
}

// Carga el perfil para /perfil y para la sincronización del carrito. Sin
// sesión o ante cualquier fallo devuelve null sin errores visibles.
export async function fetchProfile(): Promise<UserProfile | null> {
  try {
    const response = await fetch(buildUrl("/me"), {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }
    const parsed = await parseBody(response, profileSchema, "");
    return parsed.ok ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ProfileResult> {
  try {
    const response = await fetch(buildUrl("/me"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      // Solo viajan identidad, correo y contraseña actual: favorites, history
      // y cart no existen en UpdateProfileInput y nunca se envían (006/RF-3).
      body: JSON.stringify({
        username: input.username,
        displayName: input.displayName,
        email: input.email,
        currentPassword: input.currentPassword,
      }),
    });

    if (response.status === 200) {
      const parsed = await parseBody(response, profileSchema, "");
      if (!parsed.ok) {
        return {
          ok: false,
          message: "El servidor devolvió una respuesta inesperada.",
        };
      }
      return { ok: true, profile: parsed.data };
    }
    return failureFromStatus(
      response,
      "No se pudo actualizar el perfil. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}

export async function addFavorite(
  productId: string,
): Promise<FavoritesResult> {
  try {
    const response = await fetch(buildUrl("/me/favorites"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId }),
    });

    if (response.status === 200) {
      const parsed = await parseBody(response, favoritesSchema, "");
      if (!parsed.ok) {
        return {
          ok: false,
          message: "El servidor devolvió una respuesta inesperada.",
        };
      }
      return { ok: true, favorites: parsed.data };
    }
    return failureFromStatus(
      response,
      "No se pudo guardar el favorito. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}

export async function removeFavorite(
  productId: string,
): Promise<FavoritesResult> {
  try {
    const response = await fetch(
      `${buildUrl("/me/favorites")}/${encodeURIComponent(productId)}`,
      { method: "DELETE", credentials: "include" },
    );

    if (response.status === 200) {
      const parsed = await parseBody(response, favoritesSchema, "");
      if (!parsed.ok) {
        return {
          ok: false,
          message: "El servidor devolvió una respuesta inesperada.",
        };
      }
      return { ok: true, favorites: parsed.data };
    }
    return failureFromStatus(
      response,
      "No se pudo quitar el favorito. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}

// Registra la visita sin bloquear al llamante: nunca lanza ni devuelve error;
// el detalle no depende del resultado (RF-10).
export async function recordVisit(productId: string): Promise<void> {
  try {
    await fetch(buildUrl("/me/history"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId }),
    });
  } catch {
    // Sin conexión: la visita simplemente no se registra.
  }
}

export async function replaceCart(lines: CartLine[]): Promise<CartResult> {
  try {
    const response = await fetch(buildUrl("/me/cart"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(
        lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
      ),
    });

    if (response.status === 200) {
      const parsed = await parseBody(response, cartSchema, "");
      if (!parsed.ok) {
        return {
          ok: false,
          message: "El servidor devolvió una respuesta inesperada.",
        };
      }
      return { ok: true, cart: parsed.data };
    }
    return failureFromStatus(
      response,
      "No se pudo sincronizar el carrito. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}
