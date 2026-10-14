import { describe, expect, it } from "vitest";
import {
  buildCatalogParams,
  CATALOG_DEFAULTS,
  parseCatalogParams,
  SEARCH_DEBOUNCE_MS,
  SORT_OPTIONS,
  type CatalogQuery,
} from "./catalogQuery.ts";

const CATEGORIES = ["Tazas", "Poleras", "Stickers"];

function parse(query: string): CatalogQuery {
  return parseCatalogParams(new URLSearchParams(query), CATEGORIES);
}

describe("parseCatalogParams", () => {
  it("parses a full valid query", () => {
    expect(
      parse("q=taza&orden=precio-menor&pagina=2&min=5000&max=9000&categoria=tazas"),
    ).toEqual({
      q: "taza",
      orden: "precio-menor",
      pagina: 2,
      min: 5000,
      max: 9000,
      categoria: "Tazas",
    });
  });

  it("falls back to defaults when empty", () => {
    expect(parse("")).toEqual(CATALOG_DEFAULTS);
  });

  it("ignores invalid values using defaults", () => {
    expect(
      parse("orden=raro&pagina=0&min=-5&max=10.5&categoria=gorros"),
    ).toEqual({
      ...CATALOG_DEFAULTS,
      max: null,
      min: null,
    });
  });

  it("trims the search text and drops it past 100 characters", () => {
    expect(parse("q=%20%20taza%20%20").q).toBe("taza");
    expect(parse(`q=${"a".repeat(101)}`).q).toBe("");
    expect(parse(`q=${"a".repeat(100)}`).q).toBe("a".repeat(100));
  });

  it("drops the price range when min is greater than max", () => {
    expect(parse("min=9000&max=5000")).toMatchObject({ min: null, max: null });
    expect(parse("min=5000&max=5000")).toMatchObject({ min: 5000, max: 5000 });
  });
});

describe("buildCatalogParams", () => {
  it("omits every default value", () => {
    expect(buildCatalogParams(CATALOG_DEFAULTS).toString()).toBe("");
  });

  it("serializes non-default values", () => {
    expect(
      buildCatalogParams({
        q: "taza",
        orden: "nombre",
        pagina: 3,
        min: 1000,
        max: null,
        categoria: "Tazas",
      }).toString(),
    ).toBe("q=taza&orden=nombre&pagina=3&min=1000&categoria=tazas");
  });

  it("roundtrips through parse", () => {
    const query: CatalogQuery = {
      q: "polera",
      orden: "precio-mayor",
      pagina: 2,
      min: null,
      max: 20000,
      categoria: "Poleras",
    };
    expect(parse(buildCatalogParams(query).toString())).toEqual(query);
  });
});

describe("catalog constants", () => {
  it("exposes the four sort options in Spanish", () => {
    expect(SORT_OPTIONS.map((option) => option.label)).toEqual([
      "Más recientes",
      "Precio: menor a mayor",
      "Precio: mayor a menor",
      "Nombre A–Z",
    ]);
  });

  it("debounces the search by 300 ms", () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
  });
});
