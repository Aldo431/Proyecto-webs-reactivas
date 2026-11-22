import type { Promotion } from "@tiendadcc/utils";
import { describe, expect, it } from "vitest";
import { activePromotions, needsStudentHint, promotionBadge } from "./promotionFormat.ts";

function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "promo-1",
    type: "quantityPack3x2",
    label: "Pack 3x2",
    active: true,
    startsAt: null,
    endsAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("promotionBadge", () => {
  it("usa etiquetas cortas para cada tipo de promoción", () => {
    expect(promotionBadge(promotion({ type: "studentDiscount" }))).toBe(
      "20% alumno",
    );
    expect(promotionBadge(promotion({ type: "quantityPack3x2" }))).toBe(
      "Pack 3x2",
    );
    expect(promotionBadge(promotion({ type: "quantityPack2x15" }))).toBe(
      "2x15%",
    );
  });
});

describe("activePromotions", () => {
  it("filtra promociones inactivas y fuera de vigencia", () => {
    const now = new Date("2026-11-22T12:00:00.000Z");
    const items: Promotion[] = [
      promotion({ id: "always" }),
      promotion({ id: "inactive", active: false }),
      promotion({
        id: "future",
        startsAt: "2026-12-01T00:00:00.000Z",
      }),
      promotion({
        id: "past",
        endsAt: "2026-11-01T00:00:00.000Z",
      }),
      promotion({
        id: "bounded",
        startsAt: "2026-11-01T00:00:00.000Z",
        endsAt: "2026-11-30T00:00:00.000Z",
      }),
    ];

    expect(activePromotions(items, now).map((item) => item.id)).toEqual([
      "always",
      "bounded",
    ]);
  });
});

describe("needsStudentHint", () => {
  it("solo avisa a alumnos no verificados con correo institucional", () => {
    expect(needsStudentHint("ana@uchile.cl", false)).toBe(true);
    expect(needsStudentHint("ANA@UCHILE.CL", false)).toBe(true);
    expect(needsStudentHint("ana@ug.uchile.cl", false)).toBe(true);
    expect(needsStudentHint("ana@dcc.uchile.cl", false)).toBe(true);
    expect(needsStudentHint("ana@uchile.cl", true)).toBe(false);
    expect(needsStudentHint("ana@notuchile.cl", false)).toBe(false);
    expect(needsStudentHint("ana@uchile.cl.evil.com", false)).toBe(false);
    expect(needsStudentHint("ana@gmail.com", false)).toBe(false);
  });
});
