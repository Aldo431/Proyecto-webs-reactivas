import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext.tsx";
import { CartProvider, useCart } from "./CartContext.tsx";
import { clearInMemoryFallbackForTests } from "../logic/cartStorage.ts";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  name: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

const serverProfile = {
  id: okUser.id,
  name: okUser.name,
  email: okUser.email,
  emailVerified: false,
  favorites: [],
  history: [],
  cart: [{ productId: "polera-dcc", quantity: 2 }],
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
}

let recordedCalls: RecordedCall[];

function stubFetch(
  handlers: Record<string, (body: unknown) => Response | Promise<Response>>,
) {
  recordedCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      let body: unknown = null;
      try {
        body = init?.body ? JSON.parse(init.body as string) : null;
      } catch {
        body = null;
      }
      recordedCalls.push({ url, method, body });
      const handler = handlers[`${method} ${url}`];
      if (!handler) {
        throw new Error(`Sin respuesta simulada para ${method} ${url}`);
      }
      return handler(body);
    }),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}

function useProbe() {
  return { auth: useAuth(), cart: useCart() };
}

function setLocalCart(items: unknown[]): void {
  window.localStorage.setItem("cart", JSON.stringify(items));
}

beforeEach(() => {
  window.localStorage.clear();
  clearInMemoryFallbackForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  clearInMemoryFallbackForTests();
});

const loginInput = { email: "ana@dcc.uchile.cl", password: "secreto123" };

describe("CartContext / sincronización con la cuenta", () => {
  it("fusiona sumando cantidades y muestra el aviso al iniciar sesión", async () => {
    setLocalCart([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 1,
      },
    ]);
    stubFetch({
      "GET /api/auth/me": () => json(401, {}),
      "POST /api/auth/login": () => json(200, okUser),
      "GET /api/users/me": () => json(200, serverProfile),
      "PUT /api/users/me/cart": () => json(200, []),
    });

    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper,
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("anonymous");
    });

    await act(async () => {
      await result.current.auth.login(loginInput);
    });

    await waitFor(() => {
      expect(result.current.cart.mergeNotice).not.toBeNull();
    });

    expect(
      result.current.cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    ).toEqual([
      { productId: "polera-dcc", quantity: 2 },
      { productId: "taza-dcc", quantity: 1 },
    ]);

    const puts = recordedCalls.filter(
      (call) =>
        call.url === "/api/users/me/cart" && call.method === "PUT",
    );
    expect(puts.length).toBeGreaterThan(0);
    expect(puts[0]?.body).toEqual([
      { productId: "polera-dcc", quantity: 2 },
      { productId: "taza-dcc", quantity: 1 },
    ]);

    act(() => {
      result.current.cart.dismissMergeNotice();
    });
    expect(result.current.cart.mergeNotice).toBeNull();
  });

  it("adopta el carrito de la cuenta sin ningún PUT vacío con local vacío", async () => {
    stubFetch({
      "GET /api/auth/me": () => json(401, {}),
      "POST /api/auth/login": () => json(200, okUser),
      "GET /api/users/me": () => json(200, serverProfile),
      "PUT /api/users/me/cart": () => json(200, []),
    });

    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper,
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("anonymous");
    });

    await act(async () => {
      await result.current.auth.login(loginInput);
    });

    await waitFor(() => {
      expect(
        result.current.cart.items.map((item) => item.productId),
      ).toEqual(["polera-dcc"]);
    });

    const puts = recordedCalls.filter(
      (call) =>
        call.url === "/api/users/me/cart" && call.method === "PUT",
    );
    expect(puts).toEqual([]);
    expect(result.current.cart.mergeNotice).toBeNull();
  });

  it("conserva lo local y muestra error no bloqueante si falla la fusión", async () => {
    setLocalCart([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 1,
      },
    ]);
    stubFetch({
      "GET /api/auth/me": () => json(401, {}),
      "POST /api/auth/login": () => json(200, okUser),
      "GET /api/users/me": () => json(200, serverProfile),
      "PUT /api/users/me/cart": () => json(500, {}),
    });

    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper,
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("anonymous");
    });

    await act(async () => {
      await result.current.auth.login(loginInput);
    });

    await waitFor(() => {
      expect(result.current.cart.syncError).not.toBeNull();
    });

    // Lo local manda: la fusión queda en pantalla aunque el servidor falló.
    expect(
      result.current.cart.items.map((item) => item.productId),
    ).toEqual(["polera-dcc", "taza-dcc"]);
  });

  it("no toca ningún carrito al cerrar sesión", async () => {
    setLocalCart([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 1,
      },
    ]);
    stubFetch({
      "GET /api/auth/me": () => json(401, {}),
      "POST /api/auth/login": () => json(200, okUser),
      "POST /api/auth/logout": () => new Response(null, { status: 204 }),
      "GET /api/users/me": () => json(200, { ...serverProfile, cart: [] }),
      "PUT /api/users/me/cart": () => json(200, []),
    });

    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper,
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("anonymous");
    });

    await act(async () => {
      await result.current.auth.login(loginInput);
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("authenticated");
    });

    recordedCalls = [];
    await act(async () => {
      await result.current.auth.logout();
    });

    expect(result.current.auth.state.status).toBe("anonymous");
    expect(
      result.current.cart.items.map((item) => item.productId),
    ).toEqual(["taza-dcc"]);
    // Tras cerrar sesión no hay más PUT del carrito.
    expect(
      recordedCalls.filter((call) => call.url === "/api/users/me/cart"),
    ).toEqual([]);
  });

  it("no duplica ni escribe al restaurar la sesión con el carrito idéntico", async () => {
    setLocalCart([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 3,
      },
    ]);
    window.localStorage.setItem(
      `cart-synced:${okUser.id}`,
      JSON.stringify([{ productId: "taza-dcc", quantity: 3 }]),
    );
    stubFetch({
      "GET /api/auth/me": () => json(200, okUser),
      "GET /api/users/me": () =>
        json(200, {
          ...serverProfile,
          cart: [{ productId: "taza-dcc", quantity: 3 }],
        }),
      "PUT /api/users/me/cart": () => json(200, []),
    });

    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper,
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("authenticated");
    });

    // La restauración nunca escribe: el carrito queda intacto, sin aviso.
    await waitFor(() => {
      expect(recordedCalls.some((call) => call.url === "/api/users/me")).toBe(
        true,
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(
      recordedCalls.filter(
        (call) => call.url === "/api/users/me/cart" && call.method === "PUT",
      ),
    ).toEqual([]);
    expect(
      result.current.cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    ).toEqual([{ productId: "taza-dcc", quantity: 3 }]);
    expect(result.current.cart.mergeNotice).toBeNull();
  });

  it("no duplica al volver a iniciar sesión sin cambios", async () => {
    let serverCart: { productId: string; quantity: number }[] = [
      { productId: "polera-dcc", quantity: 2 },
    ];
    setLocalCart([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 1,
      },
    ]);
    stubFetch({
      "GET /api/auth/me": () => json(401, {}),
      "POST /api/auth/login": () => json(200, okUser),
      "POST /api/auth/logout": () => new Response(null, { status: 204 }),
      "GET /api/users/me": () => json(200, { ...serverProfile, cart: serverCart }),
      "PUT /api/users/me/cart": (body) => {
        serverCart = body as typeof serverCart;
        return json(200, serverCart);
      },
    });

    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper,
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("anonymous");
    });

    await act(async () => {
      await result.current.auth.login(loginInput);
    });

    await waitFor(() => {
      expect(result.current.cart.mergeNotice).not.toBeNull();
    });
    expect(serverCart).toEqual([
      { productId: "polera-dcc", quantity: 2 },
      { productId: "taza-dcc", quantity: 1 },
    ]);

    await act(async () => {
      await result.current.auth.logout();
    });
    recordedCalls = [];

    await act(async () => {
      await result.current.auth.login(loginInput);
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("authenticated");
    });
    // El delta está vacío: se adopta sin PUT y las cantidades no se duplican.
    await waitFor(() => {
      expect(
        recordedCalls.some((call) => call.url === "/api/users/me"),
      ).toBe(true);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(
      recordedCalls.filter(
        (call) => call.url === "/api/users/me/cart" && call.method === "PUT",
      ),
    ).toEqual([]);
    expect(
      result.current.cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    ).toEqual([
      { productId: "polera-dcc", quantity: 2 },
      { productId: "taza-dcc", quantity: 1 },
    ]);
  });

  it("suma solo el delta agregado como invitado tras cerrar sesión", async () => {
    let serverCart: { productId: string; quantity: number }[] = [
      { productId: "polera-dcc", quantity: 2 },
    ];
    setLocalCart([
      {
        productId: "taza-dcc",
        name: "Taza DCC",
        price: 6000,
        image: "/images/taza-dcc.png",
        quantity: 1,
      },
    ]);
    stubFetch({
      "GET /api/auth/me": () => json(401, {}),
      "POST /api/auth/login": () => json(200, okUser),
      "POST /api/auth/logout": () => new Response(null, { status: 204 }),
      "GET /api/users/me": () => json(200, { ...serverProfile, cart: serverCart }),
      "PUT /api/users/me/cart": (body) => {
        serverCart = body as typeof serverCart;
        return json(200, serverCart);
      },
    });

    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper,
    });

    await waitFor(() => {
      expect(result.current.auth.state.status).toBe("anonymous");
    });
    await act(async () => {
      await result.current.auth.login(loginInput);
    });

    // Primer login: fusión real con aviso.
    await waitFor(() => {
      expect(result.current.cart.mergeNotice).not.toBeNull();
    });
    act(() => {
      result.current.cart.dismissMergeNotice();
    });

    await act(async () => {
      await result.current.auth.logout();
    });

    act(() => {
      result.current.cart.addItem({
        id: "sticker-dcc",
        name: "Sticker DCC",
        price: 1500,
        image: "/images/sticker-dcc.png",
      });
    });
    recordedCalls = [];

    await act(async () => {
      await result.current.auth.login(loginInput);
    });

    // El resultado ya era visible en local (incluía la cuenta sincronizada),
    // así que no hay aviso; pero el delta sí se sube sin duplicar.
    await waitFor(() => {
      expect(
        recordedCalls.filter(
          (call) =>
            call.url === "/api/users/me/cart" && call.method === "PUT",
        ).length,
      ).toBeGreaterThan(0);
    });
    expect(result.current.cart.mergeNotice).toBeNull();
    // Solo el sticker (delta invitado) se suma a la cuenta ya sincronizada.
    const puts = recordedCalls.filter(
      (call) => call.url === "/api/users/me/cart" && call.method === "PUT",
    );
    expect(puts.length).toBeGreaterThan(0);
    expect(puts[puts.length - 1]?.body).toEqual([
      { productId: "polera-dcc", quantity: 2 },
      { productId: "taza-dcc", quantity: 1 },
      { productId: "sticker-dcc", quantity: 1 },
    ]);
  });
});
