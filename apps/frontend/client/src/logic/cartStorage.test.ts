import { beforeEach, describe, expect, it } from "vitest";
import {
  CART_STORAGE_KEY,
  clearInMemoryFallbackForTests,
  loadCartFromStorage,
  loadSyncedSnapshot,
  saveCartToStorage,
  saveSyncedSnapshot,
} from "./cartStorage.ts";

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
    expect(loadCartFromStorage()).toEqual([
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
    expect(loadCartFromStorage()).toEqual([]);
  });

  it("returns [] for incompatible schema without throwing", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ productId: "taza-dcc", quantity: -3 }]),
    );
    expect(loadCartFromStorage()).toEqual([]);
  });

  it("keeps the stored name, price and image without any catalog lookup", () => {
    const stored = [
      {
        productId: "6713b0c2a1f4e9d2c8b70a11",
        name: "Nombre guardado",
        price: 1,
        image: "/api/products/6713b0c2a1f4e9d2c8b70a11/image?v=1",
        quantity: 3,
      },
    ];
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
    expect(loadCartFromStorage()).toEqual(stored);
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
    expect(loadCartFromStorage()).toEqual(items);
  });
});

describe("synced snapshot", () => {
  it("guarda y carga la huella separada por cuenta", () => {
    saveSyncedSnapshot("user-1", [
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 2,
      },
    ]);

    expect(loadSyncedSnapshot("user-1")).toEqual([
      { productId: "taza-dcc", quantity: 2 },
    ]);
    expect(loadSyncedSnapshot("user-2")).toEqual([]);
  });

  it("devuelve vacío con datos corruptos", () => {
    window.localStorage.setItem("cart-synced:user-1", "no-json{");

    expect(loadSyncedSnapshot("user-1")).toEqual([]);
  });
});
