import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header.tsx";
import { AuthProvider, useAuth } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { stubAuthFetch } from "../test/authMocks.ts";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function AuthProbe() {
  const { state } = useAuth();
  return <output data-testid="auth-state">{state.status}</output>;
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Header />
                  <LocationProbe />
                  <AuthProbe />
                </>
              }
            />
            <Route path="/perfil" element={<p>Perfil (sonda)</p>} />
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

describe("Header / accesos de cuenta", () => {
  it("redirige a /iniciar-sesion sin sesión y sin marcadores Próximamente", async () => {
    stubAuthFetch();
    renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
    });

    expect(screen.queryByText("Próximamente")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Favoritos" }));
    expect(await screen.findByText("Inicia sesión (sonda)")).toBeDefined();
  });

  it("redirige Perfil a /iniciar-sesion sin sesión", async () => {
    stubAuthFetch();
    renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
    });

    fireEvent.click(screen.getByRole("button", { name: "Perfil" }));
    expect(await screen.findByText("Inicia sesión (sonda)")).toBeDefined();
  });

  it("navega a /perfil con sesión en ambos accesos", async () => {
    stubAuthFetch({
      "/api/auth/me": () =>
        new Response(JSON.stringify(okUser), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });
    renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe(
        "authenticated",
      );
    });

    const profileButton = screen.getByRole("button", { name: "Mi perfil" });
    expect(profileButton.textContent).toContain("Ana Pérez");
    fireEvent.click(profileButton);
    expect(await screen.findByText("Perfil (sonda)")).toBeDefined();
  });

  it("abre y cierra el menú hamburguesa con foco gestionado", async () => {
    stubAuthFetch();
    renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
    });

    const burger = screen.getByRole("button", { name: "Abrir menú" });
    expect(burger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(burger);
    expect(
      screen.getByRole("button", { name: "Cerrar menú" }),
    ).toBeDefined();

    const menu = screen.getByRole("navigation", { name: "Menú" });
    fireEvent.click(within(menu).getByRole("button", { name: "Favoritos" }));
    expect(await screen.findByText("Inicia sesión (sonda)")).toBeDefined();
  });

  it("cierra el menú con Escape y devuelve el foco", async () => {
    stubAuthFetch();
    renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
    });

    const burger = screen.getByRole("button", { name: "Abrir menú" });
    fireEvent.click(burger);
    expect(
      screen.getByRole("button", { name: "Cerrar menú" }),
    ).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Abrir menú" }),
      ).toBeDefined();
    });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Abrir menú",
    );
  });
});
