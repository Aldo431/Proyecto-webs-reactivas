import { describe, expect, it } from "vitest";
import {
  FAVORITES_PAGE_SIZE,
  formatViewedAt,
  HISTORY_PAGE_SIZE,
  paginate,
} from "./profilePagination.ts";

describe("paginate", () => {
  it("recorta páginas de 10 con el total correcto", () => {
    const items = Array.from({ length: 25 }, (_, index) => `p${index}`);

    const first = paginate(items, 1);
    expect(first.pageItems).toHaveLength(HISTORY_PAGE_SIZE);
    expect(first.pageItems[0]).toBe("p0");
    expect(first.totalPages).toBe(3);
    expect(first.page).toBe(1);

    const last = paginate(items, 3);
    expect(last.pageItems).toHaveLength(5);
    expect(last.pageItems[0]).toBe("p20");
  });

  it("ajusta páginas fuera de rango a la última válida", () => {
    const items = ["a", "b"];

    expect(paginate(items, 99).page).toBe(1);
    expect(paginate(items, 0).page).toBe(1);
  });

  it("devuelve vacío con una sola página cuando no hay elementos", () => {
    expect(paginate([], 1)).toEqual({
      pageItems: [],
      page: 1,
      totalPages: 1,
    });
  });
});

describe("FAVORITES_PAGE_SIZE", () => {
  it("vale 12 y pagina las favoritas", () => {
    expect(FAVORITES_PAGE_SIZE).toBe(12);
    const items = Array.from({ length: 13 }, (_, index) => `f${index}`);
    const page = paginate(items, 1, FAVORITES_PAGE_SIZE);

    expect(page.pageItems).toHaveLength(12);
    expect(page.totalPages).toBe(2);
  });
});

describe("formatViewedAt", () => {
  it("formatea la fecha en español de Chile", () => {
    const label = formatViewedAt("2026-10-13T10:00:00.000Z");

    expect(label).toContain("2026");
    expect(label).toMatch(/oct/i);
  });

  it("devuelve vacío ante un valor inválido", () => {
    expect(formatViewedAt("no-es-fecha")).toBe("");
  });
});
