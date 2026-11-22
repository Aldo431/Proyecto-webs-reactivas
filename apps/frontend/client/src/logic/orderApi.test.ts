import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrder, fetchOrders } from "./orderApi.ts";

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
      discount: null,
    },
  ],
  total: 12000,
  createdAt: "2026-11-17T22:41:03.512Z",
  updatedAt: "2026-11-17T22:41:03.512Z",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createOrder", () => {
  it("envía solo productId y cantidad por línea; precio y tarjeta nunca viajan", async () => {
    const fetchMock = vi.fn(async () => json(201, publicOrder));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createOrder([
      { productId: "taza-dcc", quantity: 2 },
    ]);

    expect(result).toEqual({ ok: true, order: publicOrder });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/orders");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({
      items: [{ productId: "taza-dcc", quantity: 2 }],
    });
    expect(init.body as string).not.toContain("4111");
    expect(init.body as string).not.toContain("cvc");
    expect(init.body as string).not.toContain("unitPrice");
    expect(init.body as string).not.toContain("total");
  });

  it("mapea el 400 del servidor al mensaje de producto no disponible", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      json(400, { message: "Uno de los productos de tu carrito ya no está disponible." }),
    ));

    const result = await createOrder([
      { productId: "6713b0c2a1f4e9d2c8b70a99", quantity: 1 },
    ]);

    expect(result).toEqual({
      ok: false,
      message: "Uno de los productos de tu carrito ya no está disponible.",
    });
  });

  it("devuelve el mensaje del endpoint ante un 500 sin cuerpo JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 500 })));

    const result = await createOrder([{ productId: "p", quantity: 1 }]);

    expect(result).toEqual({
      ok: false,
      message: "No pudimos registrar tu pedido. Inténtalo de nuevo.",
    });
  });

  it("devuelve mensaje de fallo ante 401 y ante error de red", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(401, {})));
    expect(
      await createOrder([{ productId: "p", quantity: 1 }]),
    ).toEqual({ ok: false, message: "Debes iniciar sesión." });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("red caída");
      }),
    );
    expect(
      await createOrder([{ productId: "p", quantity: 1 }]),
    ).toEqual({
      ok: false,
      message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    });
  });

  it("devuelve respuesta inesperada cuando el 201 no cumple el contrato", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      json(201, { ...publicOrder, folio: "no-es-un-folio" }),
    ));

    const result = await createOrder([{ productId: "p", quantity: 1 }]);

    expect(result).toEqual({
      ok: false,
      message: "El servidor devolvió una respuesta inesperada.",
    });
  });
});

describe("fetchOrders", () => {
  it("devuelve los pedidos del usuario con 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, [publicOrder])));

    const result = await fetchOrders();

    expect(result).toEqual({ ok: true, orders: [publicOrder] });
  });

  it("acepta un arreglo vacío y mapea el 401 a mensaje de sesión", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, [])));
    expect(await fetchOrders()).toEqual({ ok: true, orders: [] });

    vi.stubGlobal("fetch", vi.fn(async () => json(401, {})));
    expect(await fetchOrders()).toEqual({
      ok: false,
      message: "Debes iniciar sesión.",
    });
  });

  it("usa el mensaje del servidor ante fallo y respuesta inesperada ante contrato roto", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      json(503, { message: "El servicio no está disponible en este momento." }),
    ));
    expect(await fetchOrders()).toEqual({
      ok: false,
      message: "El servicio no está disponible en este momento.",
    });

    vi.stubGlobal("fetch", vi.fn(async () => json(200, [{ status: "pendiente" }])));
    expect(await fetchOrders()).toEqual({
      ok: false,
      message: "El servidor devolvió una respuesta inesperada.",
    });
  });

  it("devuelve fallo de red cuando la petición lanza", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("red caída");
      }),
    );

    expect(await fetchOrders()).toEqual({
      ok: false,
      message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    });
  });
});
