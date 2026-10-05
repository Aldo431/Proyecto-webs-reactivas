import { describe, expect, it } from "vitest";
import {
  addItemToCart,
  clearCart,
  removeItemFromCart,
  updateItemQuantity,
} from "./cartOperations.ts";
import type { CartItem } from "./cartTypes.ts";

const taza = {
  id: "taza-dcc",
  name: "Taza DCC",
  price: 6000,
  image: "/images/taza-dcc.png",
};

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

describe("addItemToCart", () => {
  it("adds a new item with quantity 1 to an empty cart", () => {
    expect(addItemToCart([], taza)).toEqual([makeItem({ quantity: 1 })]);
  });

  it("increments quantity without duplicating the row", () => {
    const items = [makeItem({ quantity: 1 })];
    expect(addItemToCart(items, taza)).toEqual([makeItem({ quantity: 2 })]);
  });

  it("increments without a maximum cap", () => {
    const items = [makeItem({ quantity: 99 })];
    expect(addItemToCart(items, taza)).toEqual([makeItem({ quantity: 100 })]);
  });
});

describe("updateItemQuantity", () => {
  it("updates the quantity of an existing item", () => {
    const items = [makeItem({ quantity: 1 })];
    expect(updateItemQuantity(items, "taza-dcc", 3)).toEqual([
      makeItem({ quantity: 3 }),
    ]);
  });

  it("removes the item when quantity is 0 or negative", () => {
    const items = [makeItem({ quantity: 2 })];
    expect(updateItemQuantity(items, "taza-dcc", 0)).toEqual([]);
    expect(updateItemQuantity(items, "taza-dcc", -1)).toEqual([]);
  });
});

describe("removeItemFromCart", () => {
  it("removes the item by productId", () => {
    const items = [
      makeItem({ productId: "taza-dcc" }),
      makeItem({ productId: "polera-dcc", quantity: 2 }),
    ];
    expect(removeItemFromCart(items, "taza-dcc")).toEqual([
      makeItem({ productId: "polera-dcc", quantity: 2 }),
    ]);
  });
});

describe("clearCart", () => {
  it("returns an empty list", () => {
    expect(clearCart()).toEqual([]);
  });
});
