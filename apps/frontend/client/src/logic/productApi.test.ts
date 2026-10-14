import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { exampleProducts } from "../test/productMocks.ts";
import {
  createProduct,
  deleteProduct,
  fetchCatalogPage,
  fetchMyProducts,
  fetchProduct,
  fetchProducts,
  fetchProductsByIds,
  updateProduct,
} from "./productApi.ts";
import { makeProduct } from "./productFixtures.ts";

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

function stubNetworkFailure() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
  );
}

const NETWORK_MESSAGE = "No se pudo conectar con el servidor. Inténtalo de nuevo.";
const UNEXPECTED_MESSAGE = "El servidor devolvió una respuesta inesperada.";

describe("fetchProducts", () => {
  it("lists the catalog with credentials and no query", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, exampleProducts));

    const result = await fetchProducts();

    expect(result).toEqual({ ok: true, products: exampleProducts });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("/api/products");
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("include");
  });

  it("builds the query from the filters", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, []));

    await fetchProducts({ categoria: "Tazas", featured: true });
    await fetchProducts({ featured: false });
    await fetchProducts({ categoria: "Poleras" });

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "/api/products?categoria=Tazas&featured=true",
      "/api/products?featured=false",
      "/api/products?categoria=Poleras",
    ]);
  });

  it("returns an unexpected-response failure when the payload is invalid", async () => {
    stubFetch(() => jsonResponse(200, [{ id: "1", name: "Sin más campos" }]));

    expect(await fetchProducts()).toEqual({
      ok: false,
      message: UNEXPECTED_MESSAGE,
    });
  });

  it("rejects a product with an invalid image reference", async () => {
    stubFetch(() =>
      jsonResponse(200, [makeProduct({ image: "javascript:alert(1)" })]),
    );

    const result = await fetchProducts();

    expect(result.ok).toBe(false);
  });

  it("returns an unexpected-response failure when the body is not JSON", async () => {
    stubFetch(() => new Response("<html>", { status: 200 }));

    expect(await fetchProducts()).toEqual({
      ok: false,
      message: UNEXPECTED_MESSAGE,
    });
  });

  it("translates a server error using the body message", async () => {
    stubFetch(() => jsonResponse(503, { message: "Servicio caído." }));

    expect(await fetchProducts()).toEqual({
      ok: false,
      message: "Servicio caído.",
    });
  });

  it("falls back to a Spanish message when the error has no JSON body", async () => {
    stubFetch(() => new Response("Bad gateway", { status: 502 }));

    expect(await fetchProducts()).toEqual({
      ok: false,
      message: "No se pudieron cargar los productos.",
    });
  });

  it("translates a network failure", async () => {
    stubNetworkFailure();

    expect(await fetchProducts()).toEqual({ ok: false, message: NETWORK_MESSAGE });
  });
});

describe("fetchCatalogPage", () => {
  const examplePage = {
    products: exampleProducts,
    total: 3,
    pagina: 1,
    porPagina: 9,
    totalPaginas: 1,
  };

  it("builds the query from all the filters", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, examplePage));

    await fetchCatalogPage({
      q: "taza",
      orden: "precio-menor",
      pagina: 2,
      min: 5000,
      max: 9000,
      categoria: "Tazas",
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/products?q=taza&orden=precio-menor&pagina=2&min=5000&max=9000&categoria=Tazas",
    );
  });

  it("parses the paginated envelope", async () => {
    stubFetch(() => jsonResponse(200, examplePage));

    expect(await fetchCatalogPage({ pagina: 1 })).toEqual({
      ok: true,
      page: examplePage,
    });
  });

  it("returns an unexpected-response failure when the payload is invalid", async () => {
    stubFetch(() => jsonResponse(200, { products: [], total: "muchos" }));

    expect(await fetchCatalogPage()).toEqual({
      ok: false,
      message: UNEXPECTED_MESSAGE,
    });
  });

  it("translates a 400 with field errors", async () => {
    stubFetch(() =>
      jsonResponse(400, {
        message: "Revisa los datos ingresados.",
        fieldErrors: { min: "El precio mínimo no puede superar al máximo." },
      }),
    );

    expect(await fetchCatalogPage({ min: 9000, max: 5000 })).toEqual({
      ok: false,
      message: "Revisa los datos ingresados.",
      fieldErrors: { min: "El precio mínimo no puede superar al máximo." },
    });
  });

  it("translates a network failure", async () => {
    stubNetworkFailure();

    expect(await fetchCatalogPage()).toEqual({
      ok: false,
      message: NETWORK_MESSAGE,
    });
  });
});

describe("fetchProductsByIds", () => {
  it("requests the ids in one comma separated query", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, exampleProducts));

    const result = await fetchProductsByIds(["taza-dcc", "polera-dcc"]);

    expect(result).toEqual({ ok: true, products: exampleProducts });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/products?ids=taza-dcc,polera-dcc",
    );
  });

  it("does not call the API for an empty list", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, []));

    expect(await fetchProductsByIds([])).toEqual({ ok: true, products: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes duplicated ids and encodes unsafe characters", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, []));

    await fetchProductsByIds(["a", "a", "b c", "d&e"]);

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/products?ids=a,b%20c,d%26e",
    );
  });

  it("splits more than 100 ids into batches and keeps their order", async () => {
    const ids = Array.from({ length: 250 }, (_, index) => `id${index}`);
    const fetchMock = stubFetch((url) => {
      const requested = new URL(url, "http://localhost")
        .searchParams.get("ids")
        ?.split(",") ?? [];
      return jsonResponse(
        200,
        requested.map((id) => makeProduct({ id, name: id })),
      );
    });

    const result = await fetchProductsByIds(ids);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const sizes = fetchMock.mock.calls.map(
      ([url]) =>
        new URL(String(url), "http://localhost").searchParams
          .get("ids")
          ?.split(",").length,
    );
    expect(sizes).toEqual([100, 100, 50]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.products.map((product) => product.id)).toEqual(ids);
    }
  });

  it("fails when any batch fails", async () => {
    const ids = Array.from({ length: 150 }, (_, index) => `id${index}`);
    let call = 0;
    stubFetch(() => {
      call += 1;
      return call === 1
        ? jsonResponse(200, [])
        : jsonResponse(500, { message: "Falla" });
    });

    expect(await fetchProductsByIds(ids)).toEqual({
      ok: false,
      message: "Falla",
    });
  });
});

describe("fetchProduct", () => {
  it("returns the validated product", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, exampleProducts[0]));

    const result = await fetchProduct("taza-dcc");

    expect(result).toEqual({ ok: true, product: exampleProducts[0] });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/products/taza-dcc");
  });

  it("encodes the id in the path", async () => {
    const fetchMock = stubFetch(() => jsonResponse(404, {}));

    await fetchProduct("a/b?c");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/products/a%2Fb%3Fc",
    );
  });

  it("flags a 404 as notFound with the server message", async () => {
    stubFetch(() => jsonResponse(404, { message: "Producto no encontrado." }));

    expect(await fetchProduct("nada")).toEqual({
      ok: false,
      message: "Producto no encontrado.",
      notFound: true,
    });
  });

  it("flags a 404 as notFound even without a JSON body", async () => {
    stubFetch(() => new Response("", { status: 404 }));

    expect(await fetchProduct("nada")).toEqual({
      ok: false,
      message: "Producto no encontrado.",
      notFound: true,
    });
  });

  it("does not flag a network failure or a server error as notFound", async () => {
    stubNetworkFailure();
    const network = await fetchProduct("x");
    stubFetch(() => jsonResponse(500, {}));
    const server = await fetchProduct("x");

    expect(network).toEqual({ ok: false, message: NETWORK_MESSAGE });
    expect(server.ok).toBe(false);
    expect(server).not.toHaveProperty("notFound");
  });
});

describe("fetchMyProducts", () => {
  it("lists the publications of the session", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, exampleProducts));

    const result = await fetchMyProducts();

    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/products/mine");
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe("include");
  });

  it("translates 401 into a login message", async () => {
    stubFetch(() => new Response("", { status: 401 }));

    expect(await fetchMyProducts()).toEqual({
      ok: false,
      message: "Debes iniciar sesión.",
    });
  });
});

describe("createProduct", () => {
  const input = {
    name: "Polerón",
    description: "Gris",
    category: "Poleras" as const,
    price: 18000,
    image: "data:image/png;base64,AAAA",
  };

  it("posts only the allowed fields as JSON and returns the product on 201", async () => {
    const created = makeProduct({ id: "6713b0c2a1f4e9d2c8b70a11" });
    const fetchMock = stubFetch(() => jsonResponse(201, created));

    const result = await createProduct({
      ...input,
      featured: true,
      seller: "otro",
    } as typeof input);

    expect(result).toEqual({ ok: true, product: created });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("/api/products");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual(input);
  });

  it("returns fieldErrors on 400", async () => {
    stubFetch(() =>
      jsonResponse(400, {
        message: "Revisa los datos ingresados.",
        fieldErrors: { image: "La imagen no puede superar 1 MB." },
      }),
    );

    expect(await createProduct(input)).toEqual({
      ok: false,
      message: "Revisa los datos ingresados.",
      fieldErrors: { image: "La imagen no puede superar 1 MB." },
    });
  });

  it("translates 413 even when a proxy answers without JSON", async () => {
    stubFetch(() => new Response("<html>Too large</html>", { status: 413 }));

    expect(await createProduct(input)).toEqual({
      ok: false,
      message: "Los datos enviados superan el tamaño máximo permitido.",
    });
  });

  it("translates 401 and network failures", async () => {
    stubFetch(() => jsonResponse(401, { message: "Debes iniciar sesión." }));
    const unauthorized = await createProduct(input);
    stubNetworkFailure();
    const offline = await createProduct(input);

    expect(unauthorized).toEqual({ ok: false, message: "Debes iniciar sesión." });
    expect(offline).toEqual({ ok: false, message: NETWORK_MESSAGE });
  });

  it("does not treat a 200 as a creation", async () => {
    stubFetch(() => jsonResponse(200, makeProduct()));

    const result = await createProduct(input);

    expect(result.ok).toBe(false);
  });
});

describe("updateProduct", () => {
  it("patches only the given fields", async () => {
    const updated = makeProduct({ id: "abc", price: 9000 });
    const fetchMock = stubFetch(() => jsonResponse(200, updated));

    const result = await updateProduct("abc", { price: 9000 });

    expect(result).toEqual({ ok: true, product: updated });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("/api/products/abc");
    expect(init?.method).toBe("PATCH");
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(String(init?.body))).toEqual({ price: 9000 });
  });

  it("translates 403 using the server message", async () => {
    stubFetch(() =>
      jsonResponse(403, {
        message: "No puedes modificar una publicación de otro usuario.",
      }),
    );

    expect(await updateProduct("abc", { price: 1 })).toEqual({
      ok: false,
      message: "No puedes modificar una publicación de otro usuario.",
    });
  });

  it("flags 404 as notFound", async () => {
    stubFetch(() => jsonResponse(404, { message: "Producto no encontrado." }));

    const result = await updateProduct("abc", { price: 1 });

    expect(result).toMatchObject({ ok: false, notFound: true });
  });

  it("returns fieldErrors on 400", async () => {
    stubFetch(() =>
      jsonResponse(400, {
        message: "Revisa los datos ingresados.",
        fieldErrors: { price: "El precio debe ser mayor a cero." },
      }),
    );

    expect(await updateProduct("abc", { price: 0 })).toMatchObject({
      ok: false,
      fieldErrors: { price: "El precio debe ser mayor a cero." },
    });
  });
});

describe("deleteProduct", () => {
  it("returns ok on 204", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    expect(await deleteProduct("abc")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("/api/products/abc");
    expect(init?.method).toBe("DELETE");
    expect(init?.credentials).toBe("include");
  });

  it("translates 403, 404 and network failures", async () => {
    stubFetch(() => new Response("", { status: 403 }));
    const forbidden = await deleteProduct("abc");
    stubFetch(() => new Response("", { status: 404 }));
    const missing = await deleteProduct("abc");
    stubNetworkFailure();
    const offline = await deleteProduct("abc");

    expect(forbidden).toEqual({
      ok: false,
      message: "No tienes permiso para realizar esta acción.",
    });
    expect(missing).toMatchObject({ ok: false, notFound: true });
    expect(offline).toEqual({ ok: false, message: NETWORK_MESSAGE });
  });
});
