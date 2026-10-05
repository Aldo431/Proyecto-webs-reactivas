import { describe, expect, it } from "vitest";
import type { Product } from "./productParse.ts";
import { makeProduct } from "./productFixtures.ts";
import { getProductById, selectFeaturedProducts } from "./productLookup.ts";

const catalog: Product[] = [
  makeProduct({
    id: "taza-dcc",
    name: "Taza DCC",
    category: "Tazas",
    image: "/images/taza-dcc.png",
    description: "Taza de cerámica con el logo del DCC.",
  }),
  makeProduct({
    id: "polera-dcc",
    name: "Polera DCC",
    category: "Poleras",
    image: "/images/polera-dcc.png",
    description: "Polera de algodón con estampado del DCC.",
  }),
];

describe("getProductById", () => {
  it("finds each product by its id", () => {
    expect(getProductById(catalog, "taza-dcc")).toEqual(catalog[0]);
    expect(getProductById(catalog, "polera-dcc")).toEqual(catalog[1]);
  });

  it("returns undefined for an unknown id", () => {
    expect(getProductById(catalog, "inexistente")).toBeUndefined();
  });

  it("returns undefined for an empty id", () => {
    expect(getProductById(catalog, "")).toBeUndefined();
  });

  it("compares ids case-sensitively", () => {
    expect(getProductById(catalog, "Taza-DCC")).toBeUndefined();
  });
});

describe("selectFeaturedProducts", () => {
  const mixedCatalog: Product[] = [
    makeProduct({ id: "a", featured: false }),
    makeProduct({ id: "b", featured: true }),
    makeProduct({ id: "c", featured: false }),
    makeProduct({ id: "d", featured: true }),
  ];
  const ids = (products: Product[]): string[] =>
    products.map((product) => product.id);

  it("keeps only the products flagged as featured", () => {
    expect(ids(selectFeaturedProducts(mixedCatalog, 3))).toEqual(["b", "d"]);
  });

  it("preserves the catalog order", () => {
    const reordered = [
      makeProduct({ id: "d", featured: true }),
      makeProduct({ id: "b", featured: true }),
    ];
    expect(ids(selectFeaturedProducts(reordered, 3))).toEqual(["d", "b"]);
  });

  it("caps the result at the given count", () => {
    const fiveFeatured = ["1", "2", "3", "4", "5"].map((id) =>
      makeProduct({ id, featured: true }),
    );
    expect(ids(selectFeaturedProducts(fiveFeatured, 3))).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("returns an empty array for a zero count", () => {
    expect(selectFeaturedProducts(mixedCatalog, 0)).toEqual([]);
  });

  it("returns an empty array when no product is featured", () => {
    const noneFeatured = [
      makeProduct({ id: "x", featured: false }),
      makeProduct({ id: "y", featured: false }),
    ];
    expect(selectFeaturedProducts(noneFeatured, 3)).toEqual([]);
  });
});
