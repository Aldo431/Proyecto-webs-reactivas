import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { stubAuthFetch } from "../test/authMocks.ts";
import { makeProduct } from "../logic/productFixtures.ts";
import { exampleProducts, productRoutes } from "../test/productMocks.ts";
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

const tazaDcc = exampleProducts[0] ?? makeProduct({ id: "taza-dcc" });

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
        if (url === "/api/products/taza-dcc") {
          return json(200, tazaDcc);
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
    stubAuthFetch(productRoutes());

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
        if (url === "/api/products/inexistente") {
          return json(404, { message: "Producto no encontrado." });
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

describe("ProductDetailPage / datos desde la API", () => {
  it("muestra un estado de carga y luego el producto con su vendedor", async () => {
    stubAuthFetch(productRoutes());

    renderDetail("taza-dcc");

    expect(screen.getByText("Cargando producto…").getAttribute("role")).toBe(
      "status",
    );
    expect(
      await screen.findByRole("heading", { name: "Taza DCC" }),
    ).toBeDefined();
    expect(screen.queryByText("Cargando producto…")).toBeNull();
    expect(screen.getByText("$6.000")).toBeDefined();
    expect(screen.getByText("Publicado por TiendaDCC")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeDefined();
  });

  it("usa la ruta de imagen de la API tal cual cuando no hay URL base", async () => {
    const uploaded = makeProduct({
      id: "6713b0c2a1f4e9d2c8b70a11",
      name: "Polerón",
      image: "/api/products/6713b0c2a1f4e9d2c8b70a11/image?v=1",
    });
    stubAuthFetch(productRoutes([uploaded]));

    renderDetail(uploaded.id);

    const image = await screen.findByRole("img", { name: "Polerón" });
    expect(image.getAttribute("src")).toBe(
      "/api/products/6713b0c2a1f4e9d2c8b70a11/image?v=1",
    );
  });

  it("muestra 'Producto no encontrado' ante un 404 sin botón de carrito", async () => {
    stubAuthFetch({
      "/api/products/fantasma": () =>
        json(404, { message: "Producto no encontrado." }),
    });

    renderDetail("fantasma");

    expect(await screen.findByText("Producto no encontrado")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Agregar al carrito" }),
    ).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("distingue un error de red del 404 y permite reintentar", async () => {
    const routes = stubAuthFetch({
      "/api/products/taza-dcc": () => json(500, { message: "Falla" }),
    });

    renderDetail("taza-dcc");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No pudimos cargar el producto.");
    expect(screen.queryByText("Producto no encontrado")).toBeNull();

    routes["/api/products/taza-dcc"] = () => json(200, tazaDcc);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", { name: "Taza DCC" }),
    ).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ofrece 'Editar publicación' solo al dueño", async () => {
    const owned = makeProduct({
      id: "6713b0c2a1f4e9d2c8b70a11",
      name: "Mi polerón",
      seller: {
        id: okUser.id,
        username: okUser.username,
        displayName: okUser.displayName,
      },
    });
    stubAuthFetch({
      ...productRoutes([owned, tazaDcc]),
      "/api/auth/me": () => json(200, okUser),
      "/api/users/me": () => json(200, profileWithFavorites([])),
      "/api/users/me/history": () => json(200, []),
    });

    const { unmount } = renderDetail(owned.id);
    const edit = await screen.findByRole("link", {
      name: "Editar publicación",
    });
    expect(edit.getAttribute("href")).toBe(`/publicaciones/${owned.id}/editar`);
    expect(screen.getByText("Publicado por Ana Pérez")).toBeDefined();
    // The owner manages the product instead of buying it.
    expect(screen.queryByRole("button", { name: "Agregar al carrito" })).toBeNull();
    expect(screen.queryByRole("button", { name: /favoritos/ })).toBeNull();
    unmount();

    renderDetail("taza-dcc");
    await screen.findByRole("heading", { name: "Taza DCC" });
    expect(
      screen.queryByRole("link", { name: "Editar publicación" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeDefined();
  });

  it("no ofrece editar a un visitante anónimo", async () => {
    stubAuthFetch(productRoutes());

    renderDetail("taza-dcc");

    await screen.findByRole("heading", { name: "Taza DCC" });
    expect(
      screen.queryByRole("link", { name: "Editar publicación" }),
    ).toBeNull();
  });
});
