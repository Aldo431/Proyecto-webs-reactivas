import { describe, expect, it } from "vitest";
import { calculatePricingQuote, bestDiscountForLine, type PricedLine } from "./pricing.ts";
import type { Promotion } from "./promotionSchemas.ts";

function promotion(type: Promotion["type"]): Promotion {
  return {
    id: type,
    type,
    label: type,
    active: true,
    startsAt: null,
    endsAt: null,
    createdAt: "2026-11-22T12:00:00.000Z",
  };
}

const ALL = [
  promotion("studentDiscount"),
  promotion("quantityPack3x2"),
  promotion("quantityPack2x15"),
];

describe("bestDiscountForLine", () => {
  it("aplica el descuento de alumno del 20%", () => {
    expect(bestDiscountForLine(15000, 1, { isStudent: true, promotions: ALL })).toEqual({
      type: "studentDiscount",
      label: "20% de descuento para alumnos",
      amount: 3000,
    });
  });

  it("respeta los mínimos de los packs", () => {
    expect(
      bestDiscountForLine(15000, 2, {
        isStudent: false,
        promotions: [promotion("quantityPack3x2")],
      }),
    ).toBeNull();
    expect(
      bestDiscountForLine(15000, 3, {
        isStudent: false,
        promotions: [promotion("quantityPack3x2")],
      })?.amount,
    ).toBe(15000);
    expect(
      bestDiscountForLine(15000, 6, {
        isStudent: false,
        promotions: [promotion("quantityPack3x2")],
      })?.amount,
    ).toBe(30000);
    expect(
      bestDiscountForLine(10000, 1, {
        isStudent: false,
        promotions: [promotion("quantityPack2x15")],
      }),
    ).toBeNull();
    expect(
      bestDiscountForLine(10000, 4, {
        isStudent: false,
        promotions: [promotion("quantityPack2x15")],
      })?.amount,
    ).toBe(6000);
  });

  it("elige el mayor monto sin acumular", () => {
    const result = bestDiscountForLine(15000, 3, { isStudent: true, promotions: ALL });
    expect(result?.type).toBe("quantityPack3x2");
    expect(result?.amount).toBe(15000);
  });

  it("redondea a enteros CLP y considera el precio con ajuste de variante", () => {
    expect(
      bestDiscountForLine(9999, 1, { isStudent: true, promotions: ALL })?.amount,
    ).toBe(2000);
  });

  it("no aplica descuento sin promociones vigentes o sin elegibilidad", () => {
    expect(bestDiscountForLine(15000, 3, { isStudent: false, promotions: [] })).toBeNull();
    expect(
      bestDiscountForLine(15000, 1, {
        isStudent: false,
        promotions: [promotion("studentDiscount")],
      }),
    ).toBeNull();
  });
});

describe("calculatePricingQuote", () => {
  const lines: PricedLine[] = [
    { productId: "p1", unitPrice: 15000, quantity: 3 },
    { productId: "p2", variantId: "v2", unitPrice: 10000, quantity: 2 },
  ];

  it("calcula subtotal, ahorro y total agregados", () => {
    const quote = calculatePricingQuote(lines, ALL, false);
    expect(quote.subtotal).toBe(65000);
    expect(quote.savings).toBe(18000);
    expect(quote.total).toBe(47000);
    expect(quote.discounts.map((discount) => discount.type)).toEqual([
      "quantityPack3x2",
      "quantityPack2x15",
    ]);
  });

  it("conserva líneas sin descuento y el identificador de variante", () => {
    const quote = calculatePricingQuote(lines, [], false);
    expect(quote.total).toBe(65000);
    expect(quote.savings).toBe(0);
    expect(quote.discounts).toEqual([]);
  });
});
