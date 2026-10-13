import { describe, expect, it } from "vitest";
import { HISTORY_PAGE_SIZE, paginate } from "./profilePagination.ts";

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
