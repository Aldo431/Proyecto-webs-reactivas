import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { fetchPromotions } from "./promotionsApi.ts";

const promotion = {
  id: "promo-1",
  type: "quantityPack3x2",
  label: "Pack 3x2",
  active: true,
  startsAt: null,
  endsAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPromotions", () => {
  it("obtiene y valida las promociones activas del catálogo", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, [promotion]));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchPromotions()).toEqual({
      ok: true,
      promotions: [promotion],
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/promotions");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
  });

  it("devuelve una lista vacía y maneja respuestas inválidas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, [])));
    expect(await fetchPromotions()).toEqual({ ok: true, promotions: [] });

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, [{}])));
    expect(await fetchPromotions()).toEqual({
      ok: false,
      message: "El servidor devolvió una respuesta inesperada.",
    });
  });

  it("devuelve errores de estado y de red", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(503, {})));
    expect(await fetchPromotions()).toEqual({
      ok: false,
      message: "No se pudieron cargar las promociones.",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("sin red");
      }),
    );
    expect(await fetchPromotions()).toEqual({
      ok: false,
      message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    });
  });
});
