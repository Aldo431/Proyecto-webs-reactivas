import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { stubAuthFetch } from "../test/authMocks.ts";
import { ProductDetailPage } from "./ProductDetailPage.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

function profileWithFavorites(favorites: string[]) {
  return {
    id: okUser.id,
    username: okUser.username,
    displayName: okUser.displayName,
    email: okUser.email,
    emailVerified: false,
    favorites,
    history: [],
    cart: [],
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderDetail(productId: string) {
  return render(
    <MemoryRouter initialEntries={[`/producto/${productId}`]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/producto/:id" element={<ProductDetailPage />} />
            <Route
              path="/iniciar-sesion"
              element={<p>Inicia sesión (sonda)</p>}
            />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ProductDetailPage / favoritos e historial", () => {
  it("registra la visita y alterna el favorito con sesión", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        calls.push(`${method} ${url}`);
        if (url === "/api/auth/me") {
          return json(200, okUser);
        }
        if (url === "/api/users/me") {
          return json(200, profileWithFavorites([]));
        }
        if (url === "/api/users/me/history") {
          return json(200, []);
        }
        if (url === "/api/users/me/favorites") {
          return json(200, ["taza-dcc"]);
        }
        throw new Error(`Sin respuesta simulada para ${method} ${url}`);
      }),
    );

    renderDetail("taza-dcc");

    const toggle = await screen.findByRole("button", {
      name: "Agregar Taza DCC a favoritos",
    });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await waitFor(() => {
      expect(calls).toContain("POST /api/users/me/history");
    });

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Quitar Taza DCC de favoritos",
        }),
      ).toBeDefined();
    });
  });

  it("redirige a /iniciar-sesion al marcar favorito como anónimo", async () => {
    stubAuthFetch();

    renderDetail("taza-dcc");

    const toggle = await screen.findByRole("button", {
      name: "Agregar Taza DCC a favoritos",
    });
    fireEvent.click(toggle);

    expect(await screen.findByText("Inicia sesión (sonda)")).toBeDefined();
  });

  it("no registra visita ni muestra favorito si el producto no existe", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push(`${init?.method ?? "GET"} ${url}`);
        if (url === "/api/auth/me") {
          return json(200, okUser);
        }
        if (url === "/api/users/me") {
          return json(200, profileWithFavorites([]));
        }
        throw new Error(`Sin respuesta simulada para ${url}`);
      }),
    );

    renderDetail("inexistente");

    expect(await screen.findByText("Producto no encontrado")).toBeDefined();
    expect(screen.queryByRole("button", { name: /favoritos/ })).toBeNull();
    expect(
      calls.some((call) => call.includes("/api/users/me/history")),
    ).toBe(false);
  });
});
