import { describe, expect, it } from "vitest";
import {
  CATEGORY_SHORTCUTS,
  catalogPathForCategory,
  parseCategoryParam,
  toCategorySlug,
} from "./categoryParam.ts";

const categories = ["Tazas", "Poleras", "Stickers"];

describe("toCategorySlug", () => {
  it("lowercases a simple category name", () => {
    expect(toCategorySlug("Tazas")).toBe("tazas");
  });

  it("removes accents and joins words with hyphens", () => {
    expect(toCategorySlug("Accesorios Técnicos")).toBe("accesorios-tecnicos");
    expect(toCategorySlug("Diseño")).toBe("diseno");
  });
});

describe("parseCategoryParam", () => {
  it("maps a valid slug to its existing category", () => {
    expect(parseCategoryParam("tazas", categories)).toBe("Tazas");
    expect(parseCategoryParam("stickers", categories)).toBe("Stickers");
  });

  it("maps a slug with removed accents back to the accented category", () => {
    expect(
      parseCategoryParam("accesorios-tecnicos", ["Accesorios Técnicos"]),
    ).toBe("Accesorios Técnicos");
  });

  it.each([
    ["a missing value", null],
    ["an empty value", ""],
    ["an uppercase value", "TAZAS"],
    ["a value with a trailing space", "tazas "],
    ["a percent-encoded value", "tazas%20"],
    ["an unknown category", "gorros"],
    ["markup", "<script>"],
  ])("returns null (Todas) for %s", (_label, rawValue) => {
    expect(parseCategoryParam(rawValue, categories)).toBeNull();
  });
});

describe("catalogPathForCategory", () => {
  it("builds the filtered catalog path", () => {
    expect(catalogPathForCategory("Poleras")).toBe(
      "/catalogo?categoria=poleras",
    );
  });
});

describe("CATEGORY_SHORTCUTS", () => {
  it("lists the home page shortcuts", () => {
    expect(CATEGORY_SHORTCUTS).toEqual(["Tazas", "Poleras", "Stickers"]);
  });
});
