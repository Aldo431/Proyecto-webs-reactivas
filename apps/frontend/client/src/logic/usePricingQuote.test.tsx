import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { resetAuthStore, useAuthStore } from "../stores/authStore.ts";
import { resetCartStore, useCartStore } from "../stores/cartStore.ts";
import { usePricingQuote } from "./usePricingQuote.ts";

const quote = {
  subtotal: 12000,
  discounts: [],
  total: 12000,
  savings: 0,
};

const user = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  role: "user" as const,
  studentVerified: false,
  mfaEnabled: false,
};

function bodyOf(fetchMock: Mock, call = 0): unknown {
  const init = fetchMock.mock.calls[call] as unknown as [string, RequestInit];
  return JSON.parse(init[1].body as string);
}

beforeEach(() => {
  window.localStorage.clear();
  resetCartStore();
  resetAuthStore();
  useCartStore.getState().setItems([
    {
      productId: "taza-dcc",
      name: "Taza DCC",
      price: 6000,
      image: "/images/taza-dcc.png",
      quantity: 2,
    },
  ]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("usePricingQuote", () => {
  it("cotiza el carrito y expone el resultado del servidor", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, quote));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePricingQuote());

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "success", quote });
    });
    expect(bodyOf(fetchMock)).toEqual({
      items: [{ productId: "taza-dcc", quantity: 2 }],
    });
  });

  it("acepta líneas explícitas sin enviar datos de presentación", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, quote));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() =>
      usePricingQuote([
        {
          productId: "polera-dcc",
          variantId: "negro",
          quantity: 1,
          name: "Polera DCC",
          price: 12000,
        } as never,
      ]),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(bodyOf(fetchMock)).toEqual({
      items: [
        { productId: "polera-dcc", variantId: "negro", quantity: 1 },
      ],
    });
  });

  it("vuelve a cotizar cuando cambia la verificación de alumno", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, quote));
    vi.stubGlobal("fetch", fetchMock);
    useAuthStore.setState({
      state: { status: "authenticated", user },
    });

    renderHook(() => usePricingQuote());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    act(() => {
      useAuthStore.setState({
        state: {
          status: "authenticated",
          user: { ...user, studentVerified: true },
        },
      });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(bodyOf(fetchMock, 1)).toEqual(bodyOf(fetchMock, 0));
  });

  it("muestra el error del servidor y permite reintentar", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, quote));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePricingQuote());

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "error",
        message:
          "El servicio no está disponible en este momento. Inténtalo más tarde.",
      });
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "success", quote });
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
