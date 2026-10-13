import { describe, expect, it } from "vitest";
import {
  areCartItemsEqual,
  mergeCarts,
  mergeWithDelta,
  refreshCartItems,
  subtractSnapshot,
} from "./cartSync.ts";
import type { CartItem } from "./cartTypes.ts";
import type { Product } from "./productParse.ts";

const catalog = [
  {
    id: "taza-dcc",
    name: "Taza DCC",
    price: 6000,
    image: "taza.png",
    category: "Tazas",
    description: "Taza del DCC.",
  },
  {
    id: "polera-dcc",
    name: "Polera DCC",
    price: 12000,
    image: "polera.png",
    category: "Ropa",
    description: "Polera del DCC.",
  },
] as Product[];

function localItem(productId: string, quantity: number): CartItem {
  return {
    productId,
    name: `viejo ${productId}`,
    price: 1,
    image: "vieja.png",
    quantity,
  };
}

describe("mergeCarts", () => {
  it("suma cantidades por productId tomando los valores del catálogo", () => {
    const { items, merged } = mergeCarts(
      [localItem("taza-dcc", 1)],
      [{ productId: "taza-dcc", quantity: 2 }],
      catalog,
    );

    expect(items).toEqual([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "taza.png",
        quantity: 3,
      },
    ]);
    expect(merged).toBe(true);
  });

  it("descarta ids inexistentes en el catálogo", () => {
    const { items, merged } = mergeCarts(
      [localItem("fantasma", 2)],
      [{ productId: "taza-dcc", quantity: 1 }],
      catalog,
    );

    expect(items.map((item) => item.productId)).toEqual(["taza-dcc"]);
    expect(merged).toBe(true);
  });

  it("adopta la cuenta sin aviso cuando lo local está vacío", () => {
    const { items, merged } = mergeCarts(
      [],
      [{ productId: "polera-dcc", quantity: 1 }],
      catalog,
    );

    expect(items).toEqual([
      {
        productId: "polera-dcc",
        name: "Polera DCC",
        price: 12000,
        image: "polera.png",
        quantity: 1,
      },
    ]);
    expect(merged).toBe(false);
  });

  it("sube lo local sin aviso cuando la cuenta está vacía", () => {
    const { items, merged } = mergeCarts(
      [localItem("taza-dcc", 2)],
      [],
      catalog,
    );

    expect(items.map((item) => item.productId)).toEqual(["taza-dcc"]);
    expect(merged).toBe(false);
  });

  it("devuelve vacío sin aviso cuando ambos están vacíos", () => {
    expect(mergeCarts([], [], catalog)).toEqual({ items: [], merged: false });
  });
});

describe("areCartItemsEqual", () => {
  it("compara por contenido sin importar el orden", () => {
    const first = [localItem("taza-dcc", 1), localItem("polera-dcc", 2)];
    const second = [localItem("polera-dcc", 2), localItem("taza-dcc", 1)];

    expect(areCartItemsEqual(first, second)).toBe(true);
  });

  it("detecta cantidades o productos distintos", () => {
    expect(
      areCartItemsEqual([localItem("taza-dcc", 1)], [localItem("taza-dcc", 2)]),
    ).toBe(false);
    expect(
      areCartItemsEqual([localItem("taza-dcc", 1)], [localItem("polera-dcc", 1)]),
    ).toBe(false);
  });
});

describe("subtractSnapshot", () => {
  it("resta la huella con mínimo cero e incluye íntegros los ids nuevos", () => {
    const delta = subtractSnapshot(
      [localItem("taza-dcc", 5), localItem("polera-dcc", 1)],
      [
        { productId: "taza-dcc", quantity: 2 },
        { productId: "sticker-dcc", quantity: 9 },
      ],
    );

    expect(delta).toEqual([
      { productId: "taza-dcc", quantity: 3 },
      { productId: "polera-dcc", quantity: 1 },
    ]);
  });

  it("devuelve vacío cuando todo ya está sincronizado", () => {
    expect(
      subtractSnapshot(
        [localItem("taza-dcc", 2)],
        [{ productId: "taza-dcc", quantity: 2 }],
      ),
    ).toEqual([]);
  });
});

describe("mergeWithDelta", () => {
  it("suma delta más cuenta e indica fusión real", () => {
    const { items, merged } = mergeWithDelta(
      [{ productId: "taza-dcc", quantity: 1 }],
      [{ productId: "polera-dcc", quantity: 2 }],
      catalog,
    );

    expect(
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    ).toEqual([
      { productId: "polera-dcc", quantity: 2 },
      { productId: "taza-dcc", quantity: 1 },
    ]);
    expect(merged).toBe(true);
  });

  it("no indica fusión con delta vacío aunque la cuenta tenga items", () => {
    const { items, merged } = mergeWithDelta(
      [],
      [{ productId: "polera-dcc", quantity: 2 }],
      catalog,
    );

    expect(items.map((item) => item.productId)).toEqual(["polera-dcc"]);
    expect(merged).toBe(false);
  });
});

describe("refreshCartItems", () => {
  const checked = new Set(["taza-dcc", "polera-dcc", "eliminado"]);

  it("updates name, price and image from the products keeping the quantity", () => {
    const items = [localItem("taza-dcc", 3)];

    expect(refreshCartItems(items, catalog, checked)).toEqual([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "taza.png",
        quantity: 3,
      },
    ]);
  });

  it("discards checked ids that the API no longer returns", () => {
    const items = [localItem("taza-dcc", 1), localItem("eliminado", 2)];

    const result = refreshCartItems(items, catalog, checked);

    expect(result.map((item) => item.productId)).toEqual(["taza-dcc"]);
  });

  it("keeps lines that were not part of the request", () => {
    const items = [localItem("taza-dcc", 1), localItem("agregado-despues", 2)];

    const result = refreshCartItems(items, catalog, checked);

    expect(result.map((item) => item.productId)).toEqual([
      "taza-dcc",
      "agregado-despues",
    ]);
    expect(result[1]).toBe(items[1]);
  });

  it("returns the same array when nothing changed", () => {
    const items: CartItem[] = [
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "taza.png",
        quantity: 2,
      },
    ];

    expect(refreshCartItems(items, catalog, checked)).toBe(items);
    expect(refreshCartItems([], catalog, checked)).toEqual([]);
  });

  it("keeps the order of the cart lines", () => {
    const items = [
      localItem("polera-dcc", 1),
      localItem("eliminado", 1),
      localItem("taza-dcc", 1),
    ];

    expect(
      refreshCartItems(items, catalog, checked).map((item) => item.productId),
    ).toEqual(["polera-dcc", "taza-dcc"]);
  });
});
