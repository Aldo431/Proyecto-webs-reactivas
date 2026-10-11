import { afterEach, describe, expect, it, vi } from "vitest";
import { makeProduct } from "./productFixtures.ts";
import {
  createFeaturedProductsSource,
  fetchFeaturedProducts,
} from "./productRepository.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchFeaturedProducts", () => {
  it("resolves the three bundled featured products in catalog order", async () => {
    const products = await fetchFeaturedProducts();
    expect(products.map((product) => product.id)).toEqual([
      "taza-dcc",
      "polera-dcc",
      "sticker-dcc",
    ]);
  });

  it("does not make any network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await fetchFeaturedProducts();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("createFeaturedProductsSource", () => {
  it("rejects when the loaded data has a product without featured", async () => {
    const source = createFeaturedProductsSource(() =>
      Promise.resolve({
        products: [
          {
            id: "1",
            name: "N",
            category: "Y",
            image: "/i.png",
            description: "d",
          },
        ],
      }),
    );
    await expect(source()).rejects.toThrow();
  });

  it("rejects when the loader rejects", async () => {
    const source = createFeaturedProductsSource(() =>
      Promise.reject(new Error("sin conexión")),
    );
    await expect(source()).rejects.toThrow("sin conexión");
  });

  it("returns at most three products when five are featured", async () => {
    const fiveFeatured = ["1", "2", "3", "4", "5"].map((id) =>
      makeProduct({ id, featured: true }),
    );
    const source = createFeaturedProductsSource(() =>
      Promise.resolve({ products: fiveFeatured }),
    );
    const products = await source();
    expect(products.map((product) => product.id)).toEqual(["1", "2", "3"]);
  });
});
