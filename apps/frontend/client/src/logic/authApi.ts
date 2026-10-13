import {
  publicUserSchema,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from "@tiendadcc/utils";
import { apiBaseUrl } from "./env.ts";

export type AuthSuccess = { ok: true; user: PublicUser };

export type AuthFailure = {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type AuthResult = AuthSuccess | AuthFailure;

interface ApiErrorBody {
  message?: string;
  fieldErrors?: Record<string, string>;
}

// Con "credentials: include" la cookie httpOnly viaja y se recibe en cada
// llamada, de modo que la sesión se mantiene sin JavaScript (RF-4).
function buildUrl(path: string): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  return `${base}/api/auth${path}`;
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

function networkFailure(): AuthFailure {
  return {
    ok: false,
    message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
  };
}

async function parseAuthResponse(response: Response): Promise<AuthResult> {
  const body: unknown = await response.json();
  const parsed = publicUserSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      message: "El servidor devolvió una respuesta inesperada.",
    };
  }
  return { ok: true, user: parsed.data };
}

async function failureFromStatus(
  response: Response,
  fallbackMessage: string,
): Promise<AuthFailure> {
  const body = await readErrorBody(response);
  if (response.status === 400) {
    const failure: AuthFailure = {
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

export async function register(input: RegisterInput): Promise<AuthResult> {
  try {
    const response = await fetch(buildUrl("/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: input.password,
      }),
    });

    if (response.status === 201) {
      return parseAuthResponse(response);
    }
    return failureFromStatus(
      response,
      "No se pudo crear la cuenta. Inténtalo de nuevo.",
    );
  } catch {
    return networkFailure();
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  try {
    const response = await fetch(buildUrl("/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
    });

    if (response.status === 200) {
      return parseAuthResponse(response);
    }
    return failureFromStatus(
      response,
      "Correo o contraseña incorrectos.",
    );
  } catch {
    return networkFailure();
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(buildUrl("/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Sin conexión o sin sesión: el cliente queda anónimo igualmente.
  }
}

// Restaura la sesión al cargar la aplicación. Cualquier fallo (401, 503 o
// red) deja al usuario anónimo sin errores visibles (RF-4).
export async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const response = await fetch(buildUrl("/me"), {
      method: "GET",
      credentials: "include",
    });

    if (response.status === 401) {
      return null;
    }
    if (!response.ok) {
      return null;
    }

    const body: unknown = await response.json();
    const parsed = publicUserSchema.safeParse(body);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}