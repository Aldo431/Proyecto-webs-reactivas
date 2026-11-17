import { describe, expect, it } from "vitest";
import {
  ADMIN_PRODUCTS_DEFAULTS,
  ADMIN_REVIEWS_DEFAULTS,
  ADMIN_USERS_DEFAULTS,
  buildAdminProductsParams,
  buildAdminReviewsParams,
  buildAdminUsersParams,
  changeFilters,
  changePage,
  parseAdminProductsParams,
  parseAdminReviewsParams,
  parseAdminUsersParams,
} from "./adminQuery.ts";

const params = (query: string) => new URLSearchParams(query);

describe("parseAdminProductsParams", () => {
  it("uses the defaults for an empty URL", () => {
    expect(parseAdminProductsParams(params(""))).toEqual(
      ADMIN_PRODUCTS_DEFAULTS,
    );
  });

  it("reads every filter", () => {
    expect(
      parseAdminProductsParams(
        params("q=%20taza%20&categoria=Poleras&destacados=true&pagina=3"),
      ),
    ).toEqual({ q: "taza", categoria: "Poleras", destacados: true, pagina: 3 });
  });

  it.each([
    ["categoria=Zapatos", { categoria: null }],
    ["destacados=false", { destacados: false }],
    ["destacados=1", { destacados: false }],
    ["pagina=0", { pagina: 1 }],
    ["pagina=-2", { pagina: 1 }],
    ["pagina=1.5", { pagina: 1 }],
    ["pagina=abc", { pagina: 1 }],
    [`q=${"a".repeat(101)}`, { q: "" }],
  ])("falls back to the default for %s", (query, expected) => {
    expect(parseAdminProductsParams(params(query))).toEqual({
      ...ADMIN_PRODUCTS_DEFAULTS,
      ...expected,
    });
  });
});

describe("buildAdminProductsParams", () => {
  it("omits the default values", () => {
    expect(buildAdminProductsParams(ADMIN_PRODUCTS_DEFAULTS).toString()).toBe(
      "",
    );
  });

  it("serializes the active filters", () => {
    expect(
      buildAdminProductsParams({
        q: "polerón",
        categoria: "Poleras",
        destacados: true,
        pagina: 2,
      }).toString(),
    ).toBe(
      "q=poler%C3%B3n&categoria=Poleras&destacados=true&pagina=2",
    );
  });

  it("round-trips through the URL", () => {
    const query = {
      q: "taza dcc",
      categoria: "Tazas" as const,
      destacados: true,
      pagina: 4,
    };
    expect(
      parseAdminProductsParams(buildAdminProductsParams(query)),
    ).toEqual(query);
  });
});

describe("users params", () => {
  it("reads and ignores invalid roles", () => {
    expect(parseAdminUsersParams(params("rol=admin&q=ana&pagina=2"))).toEqual({
      q: "ana",
      rol: "admin",
      pagina: 2,
    });
    expect(parseAdminUsersParams(params("rol=root"))).toEqual(
      ADMIN_USERS_DEFAULTS,
    );
  });

  it("serializes without defaults and round-trips", () => {
    expect(buildAdminUsersParams(ADMIN_USERS_DEFAULTS).toString()).toBe("");
    const query = { q: "ana", rol: "user" as const, pagina: 3 };
    expect(parseAdminUsersParams(buildAdminUsersParams(query))).toEqual(query);
  });
});

describe("reviews params", () => {
  it("reads rating and order, ignoring invalid values", () => {
    expect(
      parseAdminReviewsParams(params("calificacion=bajas&orden=menor")),
    ).toEqual({ calificacion: "bajas", orden: "menor", pagina: 1 });
    expect(
      parseAdminReviewsParams(params("calificacion=medias&orden=viejas")),
    ).toEqual(ADMIN_REVIEWS_DEFAULTS);
  });

  it("serializes without defaults and round-trips", () => {
    expect(buildAdminReviewsParams(ADMIN_REVIEWS_DEFAULTS).toString()).toBe("");
    const query = {
      calificacion: "altas" as const,
      orden: "menor" as const,
      pagina: 2,
    };
    expect(parseAdminReviewsParams(buildAdminReviewsParams(query))).toEqual(
      query,
    );
  });
});

describe("changeFilters / changePage", () => {
  it("clears the page when a filter changes", () => {
    const query = { ...ADMIN_PRODUCTS_DEFAULTS, pagina: 4 };

    const next = changeFilters(query, { destacados: true });

    expect(next).toEqual({ ...ADMIN_PRODUCTS_DEFAULTS, destacados: true });
    expect(buildAdminProductsParams(next).has("pagina")).toBe(false);
  });

  it("keeps the filters when only the page changes", () => {
    const query = { ...ADMIN_PRODUCTS_DEFAULTS, q: "taza" };

    expect(changePage(query, 3)).toEqual({ ...query, pagina: 3 });
  });

  it("does not mutate the original query", () => {
    const query = { ...ADMIN_USERS_DEFAULTS, pagina: 2 };
    changeFilters(query, { rol: "admin" });
    expect(query.pagina).toBe(2);
  });
});
