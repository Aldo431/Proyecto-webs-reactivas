import { describe, expect, it } from "vitest";
import {
  categoryBars,
  describeActivity,
  formatDate,
  formatRange,
  formatRating,
  formatRelativeTime,
  isLowRating,
  overviewStats,
} from "./adminFormat.ts";
import { makeAdminOverview } from "./adminFixtures.ts";

const NOW = new Date("2026-11-17T12:00:00Z");

describe("formatRelativeTime", () => {
  it.each([
    ["2026-11-17T11:59:40Z", "ahora"],
    ["2026-11-17T11:59:00Z", "hace 1 min"],
    ["2026-11-17T11:55:00Z", "hace 5 min"],
    ["2026-11-17T11:00:00Z", "hace 1 h"],
    ["2026-11-17T10:00:00Z", "hace 2 h"],
    ["2026-11-16T10:00:00Z", "ayer"],
    ["2026-11-14T12:00:00Z", "hace 3 d"],
    ["2026-10-03T12:00:00Z", "hace 45 d"],
  ])("%s -> %s", (iso, expected) => {
    expect(formatRelativeTime(iso, NOW)).toBe(expected);
  });

  it("treats a future date as now", () => {
    expect(formatRelativeTime("2026-11-17T13:00:00Z", NOW)).toBe("ahora");
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatRelativeTime("no-es-fecha", NOW)).toBe("");
  });
});

describe("formatDate", () => {
  it("formats in es-CL", () => {
    expect(formatDate("2026-11-10T12:00:00Z")).toBe("10 nov 2026");
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatDate("nada")).toBe("");
  });
});

describe("formatRating", () => {
  it.each([
    [4.2, "4,2"],
    [4, "4,0"],
    [2.5, "2,5"],
    [4.25, "4,3"],
    [null, "—"],
  ])("%s -> %s", (value, expected) => {
    expect(formatRating(value)).toBe(expected);
  });
});

describe("describeActivity", () => {
  it("describes a registration", () => {
    expect(
      describeActivity({
        type: "user_registered",
        at: "2026-11-17T10:00:00.000Z",
        user: { username: "ana" },
      }),
    ).toEqual({ user: "@ana", text: "creó su cuenta" });
  });

  it("describes a published product", () => {
    expect(
      describeActivity({
        type: "product_published",
        at: "2026-11-17T10:00:00.000Z",
        user: { username: "ana" },
        product: { id: "p1", name: "Taza DCC" },
      }),
    ).toEqual({ user: "@ana", text: "publicó «Taza DCC»" });
  });

  it("describes a review, with singular and plural stars", () => {
    const base = {
      type: "review_created" as const,
      at: "2026-11-17T10:00:00.000Z",
      user: { username: "beto" },
      product: { id: "p1", name: "Polera" },
    };
    expect(describeActivity({ ...base, rating: 1 }).text).toBe(
      "dejó una reseña de 1 estrella en «Polera»",
    );
    expect(describeActivity({ ...base, rating: 4 }).text).toBe(
      "dejó una reseña de 4 estrellas en «Polera»",
    );
  });
});

describe("categoryBars", () => {
  it("scales the widths to the largest category", () => {
    const { bars } = categoryBars([
      { category: "Tazas", count: 4 },
      { category: "Poleras", count: 2 },
      { category: "Stickers", count: 0 },
      { category: "Pins", count: 1 },
    ]);

    expect(bars.map((bar) => bar.widthPercent)).toEqual([100, 50, 0, 25]);
    expect(bars.map((bar) => bar.count)).toEqual([4, 2, 0, 1]);
  });

  it("gives every bar width 0 when there are no products", () => {
    const { bars } = categoryBars([
      { category: "Tazas", count: 0 },
      { category: "Pins", count: 0 },
    ]);

    expect(bars.map((bar) => bar.widthPercent)).toEqual([0, 0]);
  });

  it("lists every value in the aria-label", () => {
    const { ariaLabel } = categoryBars([
      { category: "Tazas", count: 4 },
      { category: "Poleras", count: 0 },
    ]);

    expect(ariaLabel).toBe("Productos por categoría: Tazas 4, Poleras 0.");
  });
});

describe("formatRange", () => {
  it.each([
    [1, 20, 57, "Mostrando 1–20 de 57"],
    [2, 20, 57, "Mostrando 21–40 de 57"],
    [3, 20, 57, "Mostrando 41–57 de 57"],
    [1, 20, 1, "Mostrando 1–1 de 1"],
    [1, 20, 0, "Mostrando 0 de 0"],
  ])("page %i of %i/%i", (pagina, porPagina, total, expected) => {
    expect(formatRange(pagina, porPagina, total)).toBe(expected);
  });
});

describe("isLowRating", () => {
  it.each([
    [1, true],
    [2, true],
    [3, false],
    [5, false],
  ])("%i -> %s", (rating, expected) => {
    expect(isLowRating(rating)).toBe(expected);
  });
});

describe("overviewStats", () => {
  it("builds the four indicators with their notes", () => {
    const stats = overviewStats(
      makeAdminOverview({
        users: { total: 27, newLast7Days: 5, admins: 2 },
        products: {
          total: 12,
          featured: 3,
          byCategory: makeAdminOverview().products.byCategory,
        },
        reviews: {
          total: 18,
          newLast7Days: 4,
          averageRating: 4.2,
          lowLast7Days: 2,
        },
      }),
    );

    expect(stats).toEqual([
      {
        label: "Usuarios registrados",
        value: "27",
        note: "+5 esta semana",
        highlightNote: true,
      },
      {
        label: "Productos publicados",
        value: "12",
        note: "3 destacados",
        highlightNote: false,
      },
      {
        label: "Reseñas",
        value: "18",
        note: "+4 esta semana",
        highlightNote: true,
      },
      {
        label: "Calificación promedio",
        value: "4,2",
        note: "de 5 estrellas",
        highlightNote: false,
      },
    ]);
  });

  it("does not highlight +0 and shows the empty rating", () => {
    const stats = overviewStats(makeAdminOverview());

    expect(stats[0]).toMatchObject({ note: "+0 esta semana", highlightNote: false });
    expect(stats[2]).toMatchObject({ note: "+0 esta semana", highlightNote: false });
    expect(stats[3]).toEqual({
      label: "Calificación promedio",
      value: "—",
      note: "sin reseñas aún",
      highlightNote: false,
    });
  });

  it("uses the singular for a single featured product", () => {
    const stats = overviewStats(
      makeAdminOverview({
        products: {
          total: 1,
          featured: 1,
          byCategory: makeAdminOverview().products.byCategory,
        },
      }),
    );

    expect(stats[1]?.note).toBe("1 destacado");
  });
});
