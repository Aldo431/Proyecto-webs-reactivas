import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentUser, login, logout, register } from "./authApi.ts";

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