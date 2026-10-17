import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchCurrentUser,
  forgotPassword,
  login,
  logout,
  register,
  resetPassword,
  validateResetToken,
} from "./authApi.ts";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

const registerInput = {
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  password: "secreto123",
  passwordConfirm: "secreto123",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("register", () => {
  it("envía username, displayName, correo y contraseña y devuelve el usuario en 201", async () => {
    const fetchMock = vi.fn(async () => json(201, okUser));
    vi.stubGlobal("fetch", fetchMock);

    const result = await register(registerInput);

    expect(result).toEqual({ ok: true, user: okUser });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/auth/register");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({
      username: "anaperez",
      displayName: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      password: "secreto123",
    });
  });

  it("mapea 400 a errores por campo", async () => {
    const fieldErrors = { email: "Correo inválido.", password: "Muy corta." };
    const fetchMock = vi.fn(async () =>
      json(400, { message: "Revisa los datos ingresados.", fieldErrors }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await register(registerInput);

    expect(result).toEqual({
      ok: false,
      message: "Revisa los datos ingresados.",
      fieldErrors,
    });
  });

  it("mapea 409 al mensaje de cuenta duplicada", async () => {
    const fetchMock = vi.fn(async () =>
      json(409, { message: "Ya existe una cuenta con ese correo electrónico." }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await register(registerInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(
        "Ya existe una cuenta con ese correo electrónico.",
      );
    }
  });

  it("devuelve mensaje de red si fetch falla", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await register(registerInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("No se pudo conectar");
    }
  });
});

describe("login", () => {
  it("devuelve el usuario en 200", async () => {
    const fetchMock = vi.fn(async () => json(200, okUser));
    vi.stubGlobal("fetch", fetchMock);

    const result = await login({
      email: "ana@dcc.uchile.cl",
      password: "secreto123",
    });

    expect(result).toEqual({ ok: true, user: okUser });
  });

  it("mapea 401 al mensaje genérico", async () => {
    const fetchMock = vi.fn(async () =>
      json(401, { message: "Correo o contraseña incorrectos." }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await login({
      email: "ana@dcc.uchile.cl",
      password: "incorrecta",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Correo o contraseña incorrectos.");
    }
  });

  it("usa el mensaje genérico si el 401 no trae cuerpo", async () => {
    const fetchMock = vi.fn(async () => json(401, {}));
    vi.stubGlobal("fetch", fetchMock);

    const result = await login({
      email: "ana@dcc.uchile.cl",
      password: "incorrecta",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Correo o contraseña incorrectos.");
    }
  });
});

describe("fetchCurrentUser", () => {
  it("devuelve el usuario en 200", async () => {
    const fetchMock = vi.fn(async () => json(200, okUser));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchCurrentUser()).toEqual(okUser);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/auth/me");
    expect(init.credentials).toBe("include");
  });

  it("devuelve null ante 401", async () => {
    const fetchMock = vi.fn(async () => json(401, { message: "No hay sesión." }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchCurrentUser()).toBeNull();
  });

  it("devuelve null ante una respuesta que no cumple el contrato", async () => {
    const fetchMock = vi.fn(async () => json(200, { extraño: true }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchCurrentUser()).toBeNull();
  });

  it("devuelve null si la red falla", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchCurrentUser()).toBeNull();
  });
});

describe("logout", () => {
  it("llama a /logout con credenciales y no lanza ante 500", async () => {
    const fetchMock = vi.fn(async () => json(500, {}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(logout()).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/auth/logout");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
  });
});

describe("forgotPassword", () => {
  it("validates email locally and sends the request with credentials", async () => {
    const fetchMock = vi.fn(async () =>
      json(200, {
        message:
          "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await forgotPassword(" ana@example.com ");
    expect(result).toEqual({
      ok: true,
      message:
        "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/forgot-password");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ email: "ana@example.com" });
  });

  it("does not call the API for an invalid email", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await forgotPassword("not-an-email");
    expect(result).toMatchObject({ ok: false, message: "Correo electrónico inválido." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps rate limiting and network errors to Spanish messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(429, { message: "Has excedido el límite de solicitudes. Intenta más tarde." }),
      ),
    );
    expect(await forgotPassword("ana@example.com")).toMatchObject({
      ok: false,
      message: "Has excedido el límite de solicitudes. Intenta más tarde.",
    });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await forgotPassword("ana@example.com")).toMatchObject({
      ok: false,
      message: "No se pudo enviar el correo. Intenta más tarde.",
    });
  });
});

describe("resetPassword", () => {
  it("sends valid reset data with credentials and parses the response", async () => {
    const fetchMock = vi.fn(async () =>
      json(200, { message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión." }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const token = "a".repeat(64);
    const result = await resetPassword(token, "newPassword123");
    expect(result).toMatchObject({ ok: true, message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión." });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/reset-password");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ token, password: "newPassword123" });
  });

  it("rejects invalid token/password before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await resetPassword("bad-token", "newPassword123")).toMatchObject({
      ok: false,
      fieldErrors: { token: "El token de restablecimiento no es válido." },
    });
    expect(await resetPassword("a".repeat(64), "short")).toMatchObject({
      ok: false,
      fieldErrors: { password: "La contraseña debe tener al menos 8 caracteres." },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a server token error and network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(400, { message: "El enlace de restablecimiento es inválido o ha expirado." })),
    );
    expect(await resetPassword("a".repeat(64), "newPassword123")).toMatchObject({
      ok: false,
      message: "El enlace de restablecimiento es inválido o ha expirado.",
    });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await resetPassword("a".repeat(64), "newPassword123")).toMatchObject({
      ok: false,
      message: "No se pudo restablecer la contraseña. Intenta más tarde.",
    });
  });
});

describe("validateResetToken", () => {
  it("validates a token using the shared response schema", async () => {
    const token = "b".repeat(64);
    const fetchMock = vi.fn(async () => json(200, { valid: true }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await validateResetToken(token)).toEqual({ ok: true, valid: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/auth/validate-reset-token/${token}`);
    expect(init.credentials).toBe("include");
  });

  it("returns invalid without requesting for a malformed token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await validateResetToken("bad-token")).toEqual({ ok: true, valid: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a failure for network or invalid response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await validateResetToken("c".repeat(64))).toMatchObject({ ok: false });
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { valid: "yes" })));
    expect(await validateResetToken("c".repeat(64))).toMatchObject({
      ok: false,
      message: "El servidor devolvió una respuesta inesperada.",
    });
  });
});
