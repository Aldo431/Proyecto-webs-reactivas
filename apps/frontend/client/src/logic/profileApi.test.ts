import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addFavorite,
  fetchProfile,
  recordVisit,
  removeFavorite,
  replaceCart,
  updateProfile,
} from "./profileApi.ts";

const okProfile = {
  id: "6712a4f3c9b1e24a8f0d1234",
  name: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  emailVerified: false,
  favorites: ["taza-dcc"],
  history: [
    { productId: "polera-dcc", viewedAt: "2026-10-13T10:00:00.000Z" },
  ],
  cart: [{ productId: "taza-dcc", quantity: 2 }],
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

describe("fetchProfile", () => {
  it("devuelve el perfil con 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, okProfile)));

    const profile = await fetchProfile();

    expect(profile).toEqual(okProfile);
  });

  it("devuelve null con 401 o en fallo de red", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(401, {})));
    expect(await fetchProfile()).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("red caída");
      }),
    );
    expect(await fetchProfile()).toBeNull();
  });
});

describe("updateProfile", () => {
  it("envía solo nombre, correo y contraseña actual", async () => {
    const fetchMock = vi.fn(async () => json(200, okProfile));
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProfile({
      name: "Ana P.",
      email: "nueva@dcc.uchile.cl",
      currentPassword: "secreto123",
    });

    expect(result).toEqual({ ok: true, profile: okProfile });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/users/me");
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Ana P.",
      email: "nueva@dcc.uchile.cl",
      currentPassword: "secreto123",
    });
  });

  it("mapea 400 a errores por campo y 401/409 a mensaje", async () => {
    const fieldErrors = { email: "Correo inválido." };
    vi.stubGlobal("fetch", vi.fn(async () =>
      json(400, { message: "Revisa los datos ingresados.", fieldErrors }),
    ));
    const invalid = await updateProfile({
      name: "Ana",
      email: "x",
      currentPassword: "secreto123",
    });
    expect(invalid).toEqual({
      ok: false,
      message: "Revisa los datos ingresados.",
      fieldErrors,
    });

    vi.stubGlobal("fetch", vi.fn(async () =>
      json(401, { message: "La contraseña actual es incorrecta." }),
    ));
    const unauthorized = await updateProfile({
      name: "Ana",
      email: "ana@dcc.uchile.cl",
      currentPassword: "otra",
    });
    expect(unauthorized).toEqual({
      ok: false,
      message: "La contraseña actual es incorrecta.",
    });
  });
});

describe("addFavorite y removeFavorite", () => {
  it("devuelven el arreglo actualizado con 200 y usan el método correcto", async () => {
    const postMock = vi.fn(async () => json(200, ["taza-dcc"]));
    vi.stubGlobal("fetch", postMock);
    expect(await addFavorite("taza-dcc")).toEqual({
      ok: true,
      favorites: ["taza-dcc"],
    });
    const [postUrl, postInit] = postMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(postUrl).toBe("/api/users/me/favorites");
    expect(postInit.method).toBe("POST");

    const deleteMock = vi.fn(async () => json(200, []));
    vi.stubGlobal("fetch", deleteMock);
    expect(await removeFavorite("taza-dcc")).toEqual({
      ok: true,
      favorites: [],
    });
    const [deleteUrl, deleteInit] = deleteMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(deleteUrl).toBe("/api/users/me/favorites/taza-dcc");
    expect(deleteInit.method).toBe("DELETE");
  });
});

describe("recordVisit", () => {
  it("envía la visita sin bloquear ni lanzar ante fallos", async () => {
    const fetchMock = vi.fn(async () => json(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await expect(recordVisit("taza-dcc")).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/users/me/history");
    expect(init.method).toBe("POST");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("red caída");
      }),
    );
    await expect(recordVisit("taza-dcc")).resolves.toBeUndefined();
  });
});

describe("replaceCart", () => {
  it("envía las líneas y devuelve el carrito actualizado", async () => {
    const fetchMock = vi.fn(async () =>
      json(200, [{ productId: "taza-dcc", quantity: 2 }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await replaceCart([
      { productId: "taza-dcc", quantity: 2 },
    ]);

    expect(result).toEqual({
      ok: true,
      cart: [{ productId: "taza-dcc", quantity: 2 }],
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/users/me/cart");
    expect(init.method).toBe("PUT");
  });

  it("mapea el fallo de red a mensaje en español", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("red caída");
      }),
    );

    const result = await replaceCart([
      { productId: "taza-dcc", quantity: 1 },
    ]);

    expect(result).toEqual({
      ok: false,
      message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    });
  });
});
