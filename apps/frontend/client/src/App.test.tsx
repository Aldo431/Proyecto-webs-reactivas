import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import {
  jsonResponse,
  stubAuthFetch,
  type FetchRoutes,
} from "./test/authMocks.ts";
import { catalogPageResponse, notFoundRoute, productRoutes } from "./test/productMocks.ts";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

let routes: FetchRoutes;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  routes = stubAuthFetch(productRoutes());
  // Catalog pages carry varying queries (?orden, ?pagina, ?q…): answer any
  // unmatched catalog URL with a paginated envelope (spec 009).
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    const url = String(input);
    const exact = routes[url];
    if (exact) {
      return Promise.resolve(exact());
    }
    const paged = catalogPageResponse("GET", url);
    if (paged) {
      return Promise.resolve(paged);
    }
    throw new Error(`Sin respuesta simulada para ${url}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the home page by default", async () => {
    renderAt("/");
    expect(await screen.findByRole("heading", { name: "TiendaDCC" })).toBeDefined();
    expect(
      await screen.findByRole("link", { name: "Registrarse ahora" }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver Catálogo" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Ver más productos" }),
    ).toBeDefined();
  });

  it("shows the example products on the home page", async () => {
    renderAt("/");
    expect(await screen.findByText("Taza DCC")).toBeDefined();
    expect(await screen.findByText("Polera DCC")).toBeDefined();
    expect(await screen.findByText("Sticker DCC")).toBeDefined();
  });

  it("navigates to register without reloading and back via the logo", async () => {
    renderAt("/");
    fireEvent.click(
      await screen.findByRole("link", { name: "Registrarse ahora" }),
    );
    expect(await screen.findByRole("heading", { name: "Registro" })).toBeDefined();
    fireEvent.click(screen.getByRole("link", { name: "TiendaDCC" }));
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("navigates to login and back via the clickable logo", async () => {
    renderAt("/");
    fireEvent.click(
      await screen.findByRole("link", { name: "Iniciar sesión" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Iniciar sesión" }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("link", { name: "TiendaDCC" }));
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("renders the register page on a direct entry", async () => {
    renderAt("/registro");
    expect(await screen.findByRole("heading", { name: "Registro" })).toBeDefined();
  });

  it("renders password recovery on a direct entry", async () => {
    renderAt("/recuperar-clave");
    expect(
      await screen.findByRole("heading", { name: "Recuperar contraseña" }),
    ).toBeDefined();
    expect(screen.getByLabelText("Correo electrónico")).toBeDefined();
  });

  it("renders the reset form on a direct entry with a valid token", async () => {
    const token = "a".repeat(64);
    routes[`/api/auth/validate-reset-token/${token}`] = () =>
      jsonResponse(200, { valid: true });
    renderAt(`/resetear-clave/${token}`);
    expect(await screen.findByLabelText("Nueva contraseña")).toBeDefined();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeDefined();
  });

  it("renders the home page on an unknown path", async () => {
    renderAt("/ruta-rara");
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("navigates to the product detail when a card link is activated", async () => {
    renderAt("/");
    fireEvent.click(await screen.findByRole("link", { name: /Taza DCC/ }));
    expect(
      await screen.findByRole("heading", { name: "Taza DCC" }),
    ).toBeDefined();
  });

  it("renders the product detail on a direct entry", async () => {
    renderAt("/producto/polera-dcc");
    expect(
      await screen.findByRole("heading", { name: "Polera DCC" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeDefined();
  });

  it("renders the not-found state for an unknown product id", async () => {
    routes["/api/products/inexistente"] = notFoundRoute();
    renderAt("/producto/inexistente");
    expect(
      await screen.findByRole("heading", { name: "Producto no encontrado" }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("returns home from the detail via the logo", async () => {
    renderAt("/producto/taza-dcc");
    fireEvent.click(
      await screen.findByRole("link", { name: "TiendaDCC" }),
    );
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("renders the catalog with filters on a direct entry", async () => {
    renderAt("/catalogo");
    expect(await screen.findByRole("heading", { name: "Catálogo" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Todas" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Tazas" })).toBeDefined();
    expect(await screen.findByText("Taza DCC")).toBeDefined();
    expect(screen.getByText("Polera DCC")).toBeDefined();
  });

  it("navigates to the catalog via Ver Catálogo and filters by category", async () => {
    renderAt("/");
    fireEvent.click(
      await screen.findByRole("link", { name: "Ver Catálogo" }),
    );
    expect(await screen.findByRole("heading", { name: "Catálogo" })).toBeDefined();
    await screen.findByText("Polera DCC");
    fireEvent.click(screen.getByRole("button", { name: "Tazas" }));
    expect(await screen.findByText("Taza DCC")).toBeDefined();
    expect(screen.queryByText("Polera DCC")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Tazas" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("navigates to the catalog via Ver más productos and back home", async () => {
    renderAt("/");
    fireEvent.click(
      await screen.findByRole("link", { name: "Ver más productos" }),
    );
    expect(await screen.findByRole("heading", { name: "Catálogo" })).toBeDefined();
    fireEvent.click(
      screen.getByRole("link", { name: "TiendaDCC" }),
    );
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("shows the displayName button and Cerrar sesión when authenticated", async () => {
    routes["/api/auth/me"] = () => jsonResponse(200, okUser);
    renderAt("/");
    const profileButton = await screen.findByRole("button", {
      name: "Mi perfil",
    });
    expect(profileButton.textContent).toContain("Ana Pérez");
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeDefined();
    expect(screen.queryByRole("link", { name: "Registrarse ahora" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
  });

  it("redirects an authenticated user from the auth routes to home", async () => {
    routes["/api/auth/me"] = () => jsonResponse(200, okUser);
    renderAt("/registro");
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Registro" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Registrarse ahora" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeDefined();
  });

  it("returns to the visitor accesses after logging out", async () => {
    routes["/api/auth/me"] = () => jsonResponse(200, okUser);
    routes["/api/auth/logout"] = () => new Response(null, { status: 204 });
    renderAt("/");
    fireEvent.click(
      await screen.findByRole("button", { name: "Cerrar sesión" }),
    );
    expect(
      await screen.findByRole("link", { name: "Registrarse ahora" }),
    ).toBeDefined();
    expect(screen.queryByText("Ana Pérez")).toBeNull();
  });
});
