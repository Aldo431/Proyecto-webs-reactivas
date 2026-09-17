import { describe, expect, it } from "vitest";
import type { Product } from "./productParse.ts";
import { getProductById } from "./productLookup.ts";

const catalog: Product[] = [
  {
    id: "taza-dcc",
    name: "Taza DCC",
    category: "Tazas",
    image: "/images/taza-dcc.png",
    description: "Taza de cerámica con el logo del DCC.",
  },
  {
    id: "polera-dcc",
    name: "Polera DCC",
    category: "Poleras",
    image: "/images/polera-dcc.png",
    description: "Polera de algodón con estampado del DCC.",
  },
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
