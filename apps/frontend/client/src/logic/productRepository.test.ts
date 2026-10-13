import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { exampleProducts } from "../test/productMocks.ts";
import { makeProduct } from "./productFixtures.ts";
import {
  createFeaturedProductsSource,
  fetchCatalogProducts,
  fetchFeaturedProducts,
} from "./productRepository.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubProductsFetch(
  handler: (url: string) => Response | Promise<Response>,
) {
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input))),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchFeaturedProducts", () => {
  it("requests the featured products from the API", async () => {
    const fetchMock = stubProductsFetch(() =>
      jsonResponse(200, exampleProducts),
    );

    const products = await fetchFeaturedProducts();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/products?featured=true",
    );
    expect(products.map((product) => product.id)).toEqual([
      "taza-dcc",
      "polera-dcc",
      "sticker-dcc",
    ]);
  });

  it("rejects when the API answers with an error", async () => {
    stubProductsFetch(() => jsonResponse(500, { message: "Falla" }));

    await expect(fetchFeaturedProducts()).rejects.toThrow("Falla");
  });

  it("rejects when the network fails", async () => {
    stubProductsFetch(() => Promise.reject(new TypeError("offline")));

    await expect(fetchFeaturedProducts()).rejects.toThrow();
  });

  it("rejects when the payload does not match the product contract", async () => {
    stubProductsFetch(() =>
      jsonResponse(200, [{ id: "1", name: "N", category: "Y" }]),
    );

    await expect(fetchFeaturedProducts()).rejects.toThrow(
      "El servidor devolvió una respuesta inesperada.",
    );
  });
});

describe("fetchCatalogProducts", () => {
  it("requests the whole catalog without filters", async () => {
    const fetchMock = stubProductsFetch(() =>
      jsonResponse(200, exampleProducts),
    );

    const products = await fetchCatalogProducts();

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/products");
    expect(products).toHaveLength(3);
  });

  it("rejects when the API fails", async () => {
    stubProductsFetch(() => jsonResponse(503, {}));

    await expect(fetchCatalogProducts()).rejects.toThrow();
  });
});

describe("createFeaturedProductsSource", () => {
  it("rejects when the loader rejects", async () => {
    const source = createFeaturedProductsSource(() =>
      Promise.reject(new Error("sin conexión")),
    );
    await expect(source()).rejects.toThrow("sin conexión");
  });

  it("keeps only products flagged as featured", async () => {
    const source = createFeaturedProductsSource(() =>
      Promise.resolve([
        makeProduct({ id: "a", featured: false }),
        makeProduct({ id: "b", featured: true }),
      ]),
    );
    const products = await source();
    expect(products.map((product) => product.id)).toEqual(["b"]);
  });

  it("returns at most three products when five are featured", async () => {
    const fiveFeatured = ["1", "2", "3", "4", "5"].map((id) =>
      makeProduct({ id, featured: true }),
    );
    const source = createFeaturedProductsSource(() =>
      Promise.resolve(fiveFeatured),
    );
    const products = await source();
    expect(products.map((product) => product.id)).toEqual(["1", "2", "3"]);
  });
});
