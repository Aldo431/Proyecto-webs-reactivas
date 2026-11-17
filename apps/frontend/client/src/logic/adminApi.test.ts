import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import {
  deleteAdminProduct,
  deleteAdminReview,
  fetchAdminOverview,
  fetchAdminProducts,
  fetchAdminReviews,
  fetchAdminUsers,
  setProductFeatured,
  setUserRole,
} from "./adminApi.ts";
import {
  makeAdminOverview,
  makeAdminPage,
  makeAdminProduct,
  makeAdminReview,
  makeAdminUser,
} from "./adminFixtures.ts";
import {
  ADMIN_PRODUCTS_DEFAULTS,
  ADMIN_REVIEWS_DEFAULTS,
  ADMIN_USERS_DEFAULTS,
} from "./adminQuery.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

type Handler = (url: string, init: RequestInit | undefined) => Response;

function stubFetch(handler: Handler) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init)),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastCall(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { url: String(url), init: init as RequestInit | undefined };
}

const NETWORK_MESSAGE =
  "No se pudo conectar con el servidor. Inténtalo de nuevo.";
const UNEXPECTED_MESSAGE = "El servidor devolvió una respuesta inesperada.";
const MISSING = "6713b0c2a1f4e9d2c8b70a99";

describe("fetchAdminOverview", () => {
  it("returns the validated overview with credentials", async () => {
    const overview = makeAdminOverview();
    const fetchMock = stubFetch(() => jsonResponse(200, overview));

    const result = await fetchAdminOverview();

    expect(result).toEqual({ ok: true, data: overview });
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("/api/admin/overview");
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("include");
  });
});

describe("fetchAdminProducts", () => {
  it("sends only the non-default filters in the query string", async () => {
    const page = makeAdminPage([makeAdminProduct()]);
    const fetchMock = stubFetch(() => jsonResponse(200, page));

    const result = await fetchAdminProducts({
      q: "polerón",
      categoria: "Poleras",
      destacados: true,
      pagina: 2,
    });

    expect(result).toEqual({ ok: true, data: page });
    expect(lastCall(fetchMock).url).toBe(
      "/api/admin/products?q=poler%C3%B3n&categoria=Poleras&destacados=true&pagina=2",
    );
  });

  it("has no query string with the default filters", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, makeAdminPage([])));

    await fetchAdminProducts(ADMIN_PRODUCTS_DEFAULTS);

    expect(lastCall(fetchMock).url).toBe("/api/admin/products");
  });
});

describe("setProductFeatured", () => {
  it("PATCHes the flag as JSON and returns the updated product", async () => {
    const product = makeAdminProduct({ featured: true });
    const fetchMock = stubFetch(() => jsonResponse(200, product));

    const result = await setProductFeatured(product.id, true);

    expect(result).toEqual({ ok: true, data: product });
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`/api/admin/products/${product.id}/featured`);
    expect(init?.method).toBe("PATCH");
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(String(init?.body))).toEqual({ featured: true });
  });
});

describe("deleteAdminProduct", () => {
  it("returns ok on 204", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    expect(await deleteAdminProduct(MISSING)).toEqual({ ok: true });
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`/api/admin/products/${MISSING}`);
    expect(init?.method).toBe("DELETE");
  });

  it("surfaces the 404 message of the API", async () => {
    stubFetch(() => jsonResponse(404, { message: "Producto no encontrado." }));

    expect(await deleteAdminProduct(MISSING)).toEqual({
      ok: false,
      message: "Producto no encontrado.",
      status: 404,
    });
  });
});

describe("fetchAdminUsers / setUserRole", () => {
  it("lists users with the role filter", async () => {
    const page = makeAdminPage([makeAdminUser({ role: "admin" })]);
    const fetchMock = stubFetch(() => jsonResponse(200, page));

    const result = await fetchAdminUsers({
      ...ADMIN_USERS_DEFAULTS,
      rol: "admin",
    });

    expect(result).toEqual({ ok: true, data: page });
    expect(lastCall(fetchMock).url).toBe("/api/admin/users?rol=admin");
  });

  it("PATCHes the role and returns the updated user", async () => {
    const user = makeAdminUser({ role: "admin" });
    const fetchMock = stubFetch(() => jsonResponse(200, user));

    const result = await setUserRole(user.id, "admin");

    expect(result).toEqual({ ok: true, data: user });
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(`/api/admin/users/${user.id}/role`);
    expect(JSON.parse(String(init?.body))).toEqual({ role: "admin" });
  });

  it("returns the 403 of changing the own role", async () => {
    stubFetch(() =>
      jsonResponse(403, { message: "No puedes cambiar tu propio rol." }),
    );

    expect(await setUserRole("yo", "user")).toEqual({
      ok: false,
      message: "No puedes cambiar tu propio rol.",
      status: 403,
    });
  });
});

describe("fetchAdminReviews / deleteAdminReview", () => {
  it("lists reviews with rating and order", async () => {
    const page = makeAdminPage([makeAdminReview()]);
    const fetchMock = stubFetch(() => jsonResponse(200, page));

    const result = await fetchAdminReviews({
      ...ADMIN_REVIEWS_DEFAULTS,
      calificacion: "bajas",
      orden: "menor",
    });

    expect(result).toEqual({ ok: true, data: page });
    expect(lastCall(fetchMock).url).toBe(
      "/api/admin/reviews?calificacion=bajas&orden=menor",
    );
  });

  it("deletes a review", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    expect(await deleteAdminReview(MISSING)).toEqual({ ok: true });
    expect(lastCall(fetchMock).url).toBe(`/api/admin/reviews/${MISSING}`);
  });
});

describe("errors", () => {
  it.each([
    [401, "Debes iniciar sesión."],
    [403, "No tienes permiso para realizar esta acción."],
    [404, "No se encontró el elemento."],
    [400, "Revisa los datos ingresados."],
  ])("uses a Spanish message for a %i without body", async (status, message) => {
    stubFetch(() => new Response("<html>", { status }));

    expect(await fetchAdminOverview()).toEqual({ ok: false, message, status });
  });

  it("prefers the message sent by the API", async () => {
    stubFetch(() =>
      jsonResponse(403, {
        message: "Solo un administrador puede realizar esta acción.",
      }),
    );

    expect(await fetchAdminOverview()).toEqual({
      ok: false,
      message: "Solo un administrador puede realizar esta acción.",
      status: 403,
    });
  });

  it("uses the fallback for an unmapped status", async () => {
    stubFetch(() => new Response("", { status: 502 }));

    expect(await fetchAdminProducts(ADMIN_PRODUCTS_DEFAULTS)).toEqual({
      ok: false,
      message: "No se pudieron cargar los productos.",
      status: 502,
    });
  });

  it("rejects a body that does not match the schema", async () => {
    stubFetch(() => jsonResponse(200, { users: "nope" }));

    expect(await fetchAdminOverview()).toEqual({
      ok: false,
      message: UNEXPECTED_MESSAGE,
      status: null,
    });
  });

  it("rejects a 200 without JSON", async () => {
    stubFetch(() => new Response("hola", { status: 200 }));

    expect(await fetchAdminUsers(ADMIN_USERS_DEFAULTS)).toEqual({
      ok: false,
      message: UNEXPECTED_MESSAGE,
      status: null,
    });
  });

  it("rejects a list that contains a malformed item", async () => {
    stubFetch(() =>
      jsonResponse(200, makeAdminPage([{ id: "x" }] as never)),
    );

    expect((await fetchAdminProducts(ADMIN_PRODUCTS_DEFAULTS)).ok).toBe(false);
  });

  it("translates a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );

    expect(await deleteAdminReview(MISSING)).toEqual({
      ok: false,
      message: NETWORK_MESSAGE,
      status: null,
    });
  });
});
