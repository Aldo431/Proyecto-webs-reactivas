import { beforeEach, describe, expect, it } from "vitest";
import { makeProduct } from "./productFixtures.ts";
import {
  CART_STORAGE_KEY,
  clearInMemoryFallbackForTests,
  loadCartFromStorage,
  saveCartToStorage,
} from "./cartStorage.ts";

const catalog = [
  makeProduct({
    id: "taza-dcc",
    name: "Taza DCC",
    price: 6000,
    image: "/images/taza-dcc.png",
  }),
  makeProduct({
    id: "polera-dcc",
    name: "Polera DCC",
    price: 12000,
    image: "/images/polera-dcc.png",
  }),
];

beforeEach(() => {
  window.localStorage.clear();
  clearInMemoryFallbackForTests();
});

describe("loadCartFromStorage", () => {
  it("returns stored items validated against the schema", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          productId: "taza-dcc",
          name: "Taza DCC",
          price: 6000,
          image: "/images/taza-dcc.png",
          quantity: 2,
        },
      ]),
    );
    expect(loadCartFromStorage(catalog)).toEqual([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 2,
      },
    ]);
  });

  it("returns [] for corrupt JSON without throwing", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "no-json{{{");
    expect(loadCartFromStorage(catalog)).toEqual([]);
  });

  it("returns [] for incompatible schema without throwing", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ productId: "taza-dcc", quantity: -3 }]),
    );
    expect(loadCartFromStorage(catalog)).toEqual([]);
  });

  it("discards items whose productId no longer exists", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          productId: "taza-dcc",
          name: "Taza DCC",
          price: 6000,
          image: "/images/taza-dcc.png",
          quantity: 1,
        },
        {
          productId: "eliminado",
          name: "Eliminado",
          price: 1000,
          image: "/i.png",
          quantity: 1,
        },
      ]),
    );
    expect(loadCartFromStorage(catalog)).toEqual([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 1,
      },
    ]);
  });

  it("updates name, price and image from the catalog keeping quantity", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          productId: "taza-dcc",
          name: "Nombre viejo",
          price: 1,
          image: "/viejo.png",
          quantity: 3,
        },
      ]),
    );
    const updatedCatalog = [
      makeProduct({
        id: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
      }),
    ];
    expect(loadCartFromStorage(updatedCatalog)).toEqual([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 3,
      },
    ]);
  });
});

describe("saveCartToStorage", () => {
  it("writes items under the cart key", () => {
    const items = [
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 2,
      },
    ];
    saveCartToStorage(items);
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBe(
      JSON.stringify(items),
    );
    expect(loadCartFromStorage(catalog)).toEqual(items);
  });
});
