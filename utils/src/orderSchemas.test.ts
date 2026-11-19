import { describe, expect, it } from "vitest";
import {
  createOrderInputSchema,
  ORDER_MAX_LINES,
  ORDER_MAX_QUANTITY,
  orderListSchema,
  orderSchema,
} from "./orderSchemas.ts";

const QUANTITY_MESSAGE =
  "La cantidad debe ser un número entero entre 1 y 999.";

const publicOrder = {
  id: "6712a4f3c9b1e24a8f0d1235",
  folio: "PED-2026-0007",
  status: "completado",
  items: [
    {
      productId: "6712a4f3c9b1e24a8f0d1234",
      name: "Taza DCC",
      image: "/images/taza-dcc.png",
      unitPrice: 6000,
      quantity: 2,
      subtotal: 12000,
    },
  ],
  total: 12000,
  createdAt: "2026-11-17T22:41:03.512Z",
  updatedAt: "2026-11-17T22:41:03.512Z",
};

const validInput = {
  items: [{ productId: "6712a4f3c9b1e24a8f0d1234", quantity: 2 }],
};

function firstMessage(
  result: { success: boolean; error?: { issues: { message: string }[] } },
): string | undefined {
  return result.error?.issues[0]?.message;
}

describe("constantes de pedidos", () => {
  it("fijan los topes de cantidad y de líneas por pedido", () => {
    expect(ORDER_MAX_QUANTITY).toBe(999);
    expect(ORDER_MAX_LINES).toBe(50);
  });
});

describe("createOrderInputSchema", () => {
  it("acepta un pedido con una línea válida y recorta el productId", () => {
    const result = createOrderInputSchema.safeParse({
      items: [{ productId: "  6712a4f3c9b1e24a8f0d1234  ", quantity: 2 }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]?.productId).toBe(
        "6712a4f3c9b1e24a8f0d1234",
      );
    }
  });

  it("acepta hasta 50 líneas y rechaza 51", () => {
    const line = { productId: "6712a4f3c9b1e24a8f0d1234", quantity: 1 };
    const fifty = { items: Array.from({ length: 50 }, () => ({ ...line })) };
    const fiftyOne = { items: Array.from({ length: 51 }, () => ({ ...line })) };

    expect(createOrderInputSchema.safeParse(fifty).success).toBe(true);
    expect(createOrderInputSchema.safeParse(fiftyOne).success).toBe(false);
  });

  it("acepta la cantidad máxima (999) y rechaza 1000", () => {
    const atMax = { items: [{ productId: "p1", quantity: ORDER_MAX_QUANTITY }] };
    const overMax = { items: [{ productId: "p1", quantity: 1000 }] };

    expect(createOrderInputSchema.safeParse(atMax).success).toBe(true);
    const result = createOrderInputSchema.safeParse(overMax);
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(QUANTITY_MESSAGE);
  });

  it.each([0, 1.5, -1, 1000, Number.NaN, "2"])(
    "rechaza la cantidad %s con mensaje en español",
    (quantity) => {
      const result = createOrderInputSchema.safeParse({
        items: [{ productId: "p1", quantity }],
      });
      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe(QUANTITY_MESSAGE);
    },
  );

  it("rechaza un carrito vacío y un productId vacío", () => {
    expect(createOrderInputSchema.safeParse({ items: [] }).success).toBe(false);
    expect(createOrderInputSchema.safeParse({}).success).toBe(false);
    expect(
      createOrderInputSchema.safeParse({
        items: [{ productId: "   ", quantity: 1 }],
      }).success,
    ).toBe(false);
  });

  it("descarta campos desconocidos como precios, totales y datos de tarjeta", () => {
    const result = createOrderInputSchema.safeParse({
      items: [
        {
          productId: "6712a4f3c9b1e24a8f0d1234",
          quantity: 2,
          unitPrice: 1,
          subtotal: 1,
          total: 1,
          cardNumber: "4111111111111111",
          cvc: "123",
          expiry: "12/30",
          holderName: "Ana",
        },
      ],
      total: 1,
      folio: "PED-1970-0001",
      status: "cancelado",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validInput);
    }
  });
});

describe("orderSchema", () => {
  it("acepta el contrato público del pedido", () => {
    expect(orderSchema.safeParse(publicOrder).success).toBe(true);
  });

  it("rechaza un estado distinto de completado", () => {
    for (const status of ["pendiente", "enviado", "COMPLETADO", ""]) {
      expect(
        orderSchema.safeParse({ ...publicOrder, status }).success,
      ).toBe(false);
    }
  });

  it.each([
    "P-2026-0007",
    "PED-2026-0007 ",
    "PED-0007",
    "PED-20260-0007",
    "PED-2026-000A",
    "ped-2026-0007",
    "PED-2026-1",
  ])("rechaza el folio inválido «%s»", (folio) => {
    const result = orderSchema.safeParse({ ...publicOrder, folio });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Folio de pedido inválido.");
  });

  it("acepta folios con más de 4 dígitos en el correlativo", () => {
    for (const folio of ["PED-2026-0001", "PED-2030-0123", "PED-2026-10000"]) {
      expect(
        orderSchema.safeParse({ ...publicOrder, folio }).success,
      ).toBe(true);
    }
  });

  it("rechaza precios o totales no enteros o no positivos", () => {
    const line = publicOrder.items[0]!;
    for (const bad of [
      { ...publicOrder, total: 12000.5 },
      { ...publicOrder, total: 0 },
      { ...publicOrder, total: -100 },
      { ...publicOrder, total: "12000" },
      {
        ...publicOrder,
        items: [{ ...line, unitPrice: 6000.5 }],
      },
      {
        ...publicOrder,
        items: [{ ...line, unitPrice: 0 }],
      },
      {
        ...publicOrder,
        items: [{ ...line, subtotal: 0 }],
      },
      {
        ...publicOrder,
        items: [{ ...line, quantity: 1000 }],
      },
    ]) {
      expect(orderSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("rechaza fechas no ISO y líneas públicas mal formadas", () => {
    const line = publicOrder.items[0]!;
    expect(
      orderSchema.safeParse({ ...publicOrder, createdAt: "ayer" }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({ ...publicOrder, updatedAt: "17-11-2026" }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({
        ...publicOrder,
        items: [{ ...line, name: "" }],
      }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({
        ...publicOrder,
        items: [{ ...line, productId: "" }],
      }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({ ...publicOrder, items: [] }).success,
    ).toBe(false);
  });

  it("acepta varias líneas y calcula nada: el total llega del servidor", () => {
    const twoItems = {
      ...publicOrder,
      items: [
        publicOrder.items[0]!,
        { ...publicOrder.items[0]!, quantity: 1, subtotal: 6000 },
      ],
      total: 18000,
    };
    expect(orderSchema.safeParse(twoItems).success).toBe(true);
  });
});

describe("orderListSchema", () => {
  it("acepta un arreglo vacío y una lista de pedidos", () => {
    expect(orderListSchema.safeParse([]).success).toBe(true);
    expect(orderListSchema.safeParse([publicOrder, publicOrder]).success).toBe(
      true,
    );
  });

  it("rechaza un valor que no es arreglo o un pedido inválido en la lista", () => {
    expect(orderListSchema.safeParse("no es un arreglo").success).toBe(false);
    expect(
      orderListSchema.safeParse([{ ...publicOrder, folio: "INVALIDO" }])
        .success,
    ).toBe(false);
  });
});
