import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { PaymentPage } from "./PaymentPage.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

const cartWithItems = [
  {
    productId: "taza-dcc",
    name: "Taza DCC",
    price: 6000,
    image: "/images/taza-dcc.png",
    quantity: 2,
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/pago"]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/pago" element={<PaymentPage />} />
            <Route path="/catalogo" element={<p>Catálogo (sonda)</p>} />
            <Route path="/" element={<p>Inicio (sonda)</p>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function stubAuthenticatedSession() {
  const routes = stubAuthFetch();
  routes["/api/auth/me"] = () => jsonResponse(200, okUser);
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("PaymentPage", () => {
  it("redirects to /catalogo when the cart is empty", async () => {
    stubAuthenticatedSession();

    renderPage();

    expect(await screen.findByText("Catálogo (sonda)")).toBeDefined();
  });

  it("shows the read-only summary with the total and the pay button amount", async () => {
    stubAuthenticatedSession();
    window.localStorage.setItem("cart", JSON.stringify(cartWithItems));

    renderPage();

    expect(await screen.findByText("Resumen de compra")).toBeDefined();
    expect(screen.getByText("Taza DCC")).toBeDefined();
    expect(
      screen.getAllByText("$12.000").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Pagar $12.000" })).toBeDefined();
  });

  it("completes the mock payment and empties the cart on success", async () => {
    stubAuthenticatedSession();
    window.localStorage.setItem("cart", JSON.stringify(cartWithItems));

    renderPage();

    fireEvent.change(await screen.findByLabelText("Correo electrónico"), {
      target: { value: "ana@dcc.uchile.cl" },
    });
    fireEvent.change(screen.getByLabelText("Número de tarjeta"), {
      target: { value: "4111111111111111" },
    });
    fireEvent.change(screen.getByLabelText("Vencimiento (MM/AA)"), {
      target: { value: "1229" },
    });
    fireEvent.change(screen.getByLabelText("CVC"), {
      target: { value: "123" },
    });
    fireEvent.change(screen.getByLabelText("Nombre del titular"), {
      target: { value: "Ana Pérez" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pagar $12.000" }));

    expect(
      await screen.findByRole("heading", {
        name: "¡Compra realizada con éxito!",
      }),
    ).toBeDefined();
    expect(window.localStorage.getItem("cart")).toBe("[]");
    expect(screen.queryByLabelText("Número de tarjeta")).toBeNull();
  });
});
