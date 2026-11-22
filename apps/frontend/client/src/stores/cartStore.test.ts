import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearInMemoryFallbackForTests } from "../logic/cartStorage.ts";
import {
  resetCartStore,
  selectTotalAmount,
  selectTotalCount,
  useCartStore,
} from "./cartStore.ts";

const taza = {
  id: "taza-dcc",
  name: "Taza DCC",
  price: 6000,
  image: "/images/taza-dcc.png",
};

const poleraM = {
  id: "polera-dcc",
  name: "Polera DCC",
  price: 12000,
  image: "/images/polera-dcc.png",
  variantId: "m",
  variantName: "M",
  stock: 2,
};

beforeEach(() => {
  window.localStorage.clear();
  clearInMemoryFallbackForTests();
  resetCartStore();
});

afterEach(() => {
  window.localStorage.clear();
  clearInMemoryFallbackForTests();
});

describe("cartStore (spec 015, RF-2)", () => {
  it("parte con el carrito guardado en localStorage", () => {
    window.localStorage.setItem(
      "cart",
      JSON.stringify([
        {
          productId: taza.id,
          name: taza.name,
          price: taza.price,
          image: taza.image,
          quantity: 2,
        },
      ]),
    );

    resetCartStore();

    expect(useCartStore.getState().items).toEqual([
      {
        productId: taza.id,
        name: taza.name,
        price: taza.price,
        image: taza.image,
        quantity: 2,
      },
    ]);
  });

  it("agrega líneas y suma cantidades del mismo producto", () => {
    const { addItem } = useCartStore.getState();

    addItem(taza);
    addItem(taza);
    addItem(poleraM);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.items[0]?.quantity).toBe(2);
    expect(selectTotalCount(state)).toBe(3);
    expect(selectTotalAmount(state)).toBe(2 * 6000 + 12000);
  });

  it("respeta el stock de la variante al agregar y al cambiar la cantidad", () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(poleraM);
    addItem(poleraM);
    addItem(poleraM);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);

    updateQuantity(poleraM.id, 10, poleraM.variantId);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });

  it("quita una línea al llevar su cantidad a cero o con removeItem", () => {
    const { addItem, updateQuantity, removeItem } = useCartStore.getState();
    addItem(taza);
    addItem(poleraM);

    updateQuantity(taza.id, 0);
    expect(useCartStore.getState().items.map((item) => item.productId)).toEqual(
      [poleraM.id],
    );

    removeItem(poleraM.id, poleraM.variantId);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("vacía el carrito con clearCart", () => {
    const { addItem, clearCart } = useCartStore.getState();
    addItem(taza);

    clearCart();

    expect(useCartStore.getState().items).toEqual([]);
    expect(selectTotalAmount(useCartStore.getState())).toBe(0);
  });

  it("abre, cierra y alterna el panel del carrito", () => {
    const { openCart, closeCart, toggleCart } = useCartStore.getState();

    openCart();
    expect(useCartStore.getState().isOpen).toBe(true);
    closeCart();
    expect(useCartStore.getState().isOpen).toBe(false);
    toggleCart();
    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("descarta el aviso de fusión", () => {
    useCartStore.getState().setMergeNotice("Combinamos tus carritos.");

    useCartStore.getState().dismissMergeNotice();

    expect(useCartStore.getState().mergeNotice).toBeNull();
  });

  it("resetCartStore limpia el estado de UI", () => {
    const store = useCartStore.getState();
    store.openCart();
    store.setSyncError("Error");
    store.setMergeNotice("Aviso");

    resetCartStore();

    const state = useCartStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.syncError).toBeNull();
    expect(state.mergeNotice).toBeNull();
  });
});
