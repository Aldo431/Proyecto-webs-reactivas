import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "./App.tsx";
import { CartProvider } from "./context/CartContext.tsx";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("renders the home page by default", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "TiendaDCC" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Registrarse ahora" }),
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

  it("navigates to register without reloading and back via Volver", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "Registrarse ahora" }));
    expect(await screen.findByRole("heading", { name: "Registro" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("navigates to login and back via the clickable logo", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "Iniciar sesión" }));
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
      screen.getByRole("button", { name: "Volver al inicio" }),
    ).toBeDefined();
  });

  it("renders the not-found state for an unknown product id", async () => {
    renderAt("/producto/inexistente");
    expect(
      await screen.findByRole("heading", { name: "Producto no encontrado" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Volver al inicio" }),
    ).toBeDefined();
  });

  it("returns home from the detail via Volver al inicio", async () => {
    renderAt("/producto/taza-dcc");
    fireEvent.click(
      await screen.findByRole("button", { name: "Volver al inicio" }),
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
    expect(screen.getByText("Taza DCC")).toBeDefined();
    expect(screen.getByText("Polera DCC")).toBeDefined();
  });

  it("navigates to the catalog via Ver Catálogo and filters by category", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "Ver Catálogo" }));
    expect(await screen.findByRole("heading", { name: "Catálogo" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Tazas" }));
    expect(screen.getByText("Taza DCC")).toBeDefined();
    expect(screen.queryByText("Polera DCC")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Tazas" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("navigates to the catalog via Ver más productos and back home", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "Ver más productos" }));
    expect(await screen.findByRole("heading", { name: "Catálogo" })).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Volver al inicio" }),
    );
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });
});
