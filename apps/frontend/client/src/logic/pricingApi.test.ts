import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { fetchPricingQuote } from "./pricingApi.ts";

const quote = {
  subtotal: 12000,
  discounts: [
    {
      type: "quantityPack3x2",
      label: "Pack 3x2",
      amount: 4000,
    },
  ],
  total: 8000,
  savings: 4000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPricingQuote", () => {
  it("rechaza un carrito vacío sin llamar a la API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPricingQuote([]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("El carrito está vacío.");
      expect(result.fieldErrors?.items).toBe("El carrito está vacío.");
    }
  });

  it("envía solo identificadores y cantidades, sin precios", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, quote));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPricingQuote([
      {
        productId: "taza-dcc",
        variantId: "negro",
        quantity: 2,
        name: "Taza DCC",
        price: 6000,
      } as never,
    ]);

    expect(result).toEqual({ ok: true, quote });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/pricing/quote");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({
      items: [{ productId: "taza-dcc", variantId: "negro", quantity: 2 }],
    });
    expect(init.body as string).not.toContain("price");
    expect(init.body as string).not.toContain("total");
  });

  it("devuelve mensajes en español según el estado", async () => {
    const cases = [
      [401, "Inicia sesión para ver tus descuentos."],
      [429, "Has excedido el límite de solicitudes. Intenta más tarde."],
      [
        503,
        "El servicio no está disponible en este momento. Inténtalo más tarde.",
      ],
      [500, "No se pudo calcular el precio. Intenta más tarde."],
    ] as const;

    for (const [status, message] of cases) {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(status, {})));
      expect(await fetchPricingQuote([{ productId: "taza-dcc", quantity: 2 }])).toEqual(
        { ok: false, message },
      );
    }
  });

  it("detecta respuestas mal formadas y fallos de red", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, {})));
    expect(
      await fetchPricingQuote([{ productId: "taza-dcc", quantity: 2 }]),
    ).toEqual({
      ok: false,
      message: "El servidor devolvió una respuesta inesperada.",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("sin red");
      }),
    );
    expect(
      await fetchPricingQuote([{ productId: "taza-dcc", quantity: 2 }]),
    ).toEqual({
      ok: false,
      message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    });
  });
});
