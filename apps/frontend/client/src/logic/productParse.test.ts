import { describe, expect, it } from "vitest";
import productsJson from "../data/products.json";
import { parseProducts, productSchema } from "./productParse.ts";

describe("parseProducts", () => {
  it("accepts the bundled example catalog", () => {
    expect(() => parseProducts(productsJson)).not.toThrow();
  });

  it("returns at least three example products", () => {
    const products = parseProducts(productsJson);
    expect(products.length).toBeGreaterThanOrEqual(3);
  });

  it("returns products that conform to the product schema", () => {
    const products = parseProducts(productsJson);
    for (const product of products) {
      expect(productSchema.safeParse(product).success).toBe(true);
    }
  });

  it("rejects a product without an id", () => {
    const bad = {
      products: [
        { name: "X", category: "Y", image: "/i.png", description: "d" },
      ],
    };
    expect(() => parseProducts(bad)).toThrow();
  });

  it("rejects a product with a non-string name", () => {
    const bad = {
      products: [
        { id: "1", name: 42, category: "Y", image: "/i.png", description: "d" },
      ],
    };
    expect(() => parseProducts(bad)).toThrow();
  });

  it("rejects a product without an image path", () => {
    const bad = {
      products: [{ id: "1", name: "N", category: "Y", description: "d" }],
    };
    expect(() => parseProducts(bad)).toThrow();
  });

  it("rejects a payload without products", () => {
    expect(() => parseProducts({})).toThrow();
  });
});