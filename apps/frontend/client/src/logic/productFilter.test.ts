import { describe, expect, it } from "vitest";
import type { Product } from "./productParse.ts";
import { filterProductsByCategory, getCategories } from "./productFilter.ts";
import { makeProduct } from "./productFixtures.ts";

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
  makeProduct({
    id: "sticker-dcc",
    name: "Sticker DCC",
    category: "Stickers",
    image: "/images/sticker-dcc.png",
    description: "Stickers con el logo del DCC.",
  }),
  makeProduct({
    id: "taza-docente",
    name: "Taza Docente",
    category: "Tazas",
    image: "/images/taza-docente.png",
    description: "Otra taza.",
  }),
];

describe("getCategories", () => {
  it("returns unique categories in order of appearance", () => {
    expect(getCategories(catalog)).toEqual(["Tazas", "Poleras", "Stickers"]);
  });

  it("returns an empty array for an empty catalog", () => {
    expect(getCategories([])).toEqual([]);
  });
});

describe("filterProductsByCategory", () => {
  it("returns all products for a null category", () => {
    expect(filterProductsByCategory(catalog, null)).toEqual(catalog);
  });

  it("returns only the products of the given category", () => {
    const filtered = filterProductsByCategory(catalog, "Tazas");
    expect(filtered.map((product) => product.id)).toEqual([
      "taza-dcc",
      "taza-docente",
    ]);
  });

  it("returns an empty array for an unknown category", () => {
    expect(filterProductsByCategory(catalog, "Gorros")).toEqual([]);
  });
});
