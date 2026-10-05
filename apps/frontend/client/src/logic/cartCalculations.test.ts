import { describe, expect, it } from "vitest";
import {
  calculateCartTotal,
  calculateItemSubtotal,
  calculateTotalQuantity,
  formatPriceCLP,
  getCartBadgeText,
} from "./cartCalculations.ts";
import type { CartItem } from "./cartTypes.ts";

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "taza-dcc",
    name: "Taza DCC",
    price: 6000,
    image: "/images/taza-dcc.png",
    quantity: 1,
    ...overrides,
  };
}

describe("calculateItemSubtotal", () => {
  it("multiplies price by quantity", () => {
    expect(calculateItemSubtotal(6000, 2)).toBe(12000);
  });
});

describe("calculateCartTotal", () => {
  it("sums subtotals of multiple items", () => {
    const items = [
      makeItem({ price: 6000, quantity: 2 }),
      makeItem({ productId: "polera-dcc", price: 12000, quantity: 1 }),
    ];
    expect(calculateCartTotal(items)).toBe(24000);
  });

  it("returns 0 for an empty cart", () => {
    expect(calculateCartTotal([])).toBe(0);
  });
});

describe("calculateTotalQuantity", () => {
  it("sums quantities of all items", () => {
    const items = [makeItem({ quantity: 2 }), makeItem({ quantity: 3 })];
    expect(calculateTotalQuantity(items)).toBe(5);
  });
});

describe("getCartBadgeText", () => {
  it("returns null when empty", () => {
    expect(getCartBadgeText(0)).toBeNull();
  });

  it("returns the count between 1 and 99", () => {
    expect(getCartBadgeText(5)).toBe("5");
  });

  it("caps at 99+ above 99", () => {
    expect(getCartBadgeText(120)).toBe("99+");
  });
});

describe("formatPriceCLP", () => {
  it("formats 6000 as Chilean pesos", () => {
    expect(formatPriceCLP(6000)).toBe("$6.000");
  });
});
