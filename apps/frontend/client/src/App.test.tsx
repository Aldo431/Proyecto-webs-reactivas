import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, describe, it } from "vitest";
import { App } from "./App.tsx";

beforeEach(() => {
  window.location.hash = "#/";
});

describe("App", () => {
  it("renders the home page by default", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "TiendaDCC" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Registrarse ahora" }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeDefined();
  });

  it("shows the example products on the home page", () => {
    render(<App />);
    expect(screen.getByText("Taza DCC")).toBeDefined();
    expect(screen.getByText("Polera DCC")).toBeDefined();
    expect(screen.getByText("Sticker DCC")).toBeDefined();
  });

  it("navigates to register without reloading and back via Volver", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Registrarse ahora" }));
    expect(await screen.findByRole("heading", { name: "Registro" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("navigates to login and back via the clickable logo", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(
      await screen.findByRole("heading", { name: "Iniciar sesión" }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "TiendaDCC" }));
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });

  it("renders the register page on a direct URL hash", async () => {
    window.location.hash = "#/registro";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Registro" })).toBeDefined();
  });

  it("keeps the current page when the hash does not change", async () => {
    window.location.hash = "#/iniciar-sesion";
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Iniciar sesión" }),
    ).toBeDefined();
    window.location.hash = "#/iniciar-sesion";
    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeDefined();
  });

  it("navigates to the product detail when a card link is activated", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: /Taza DCC/ }));
    expect(
      await screen.findByRole("heading", { name: "Taza DCC" }),
    ).toBeDefined();
  });

  it("renders the product detail on a direct URL hash", async () => {
    window.location.hash = "#/producto/polera-dcc";
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Polera DCC" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Volver al inicio" }),
    ).toBeDefined();
  });

  it("renders the not-found state for an unknown product id", async () => {
    window.location.hash = "#/producto/inexistente";
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Producto no encontrado" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Volver al inicio" }),
    ).toBeDefined();
  });

  it("returns home from the detail via Volver al inicio", async () => {
    window.location.hash = "#/producto/taza-dcc";
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Volver al inicio" }),
    );
    expect(
      await screen.findByRole("heading", { name: "TiendaDCC" }),
    ).toBeDefined();
  });
});