import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../context/CartContext.tsx";
import { RegisterPage } from "./RegisterPage.tsx";

function renderPage() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <RegisterPage />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  it("shows the four required fields", () => {
    renderPage();
    expect(screen.getByLabelText("Nombre")).toBeDefined();
    expect(screen.getByLabelText("Correo electrónico")).toBeDefined();
    expect(screen.getByLabelText("Contraseña")).toBeDefined();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeDefined();
  });

  it("does not validate, submit or navigate on submit", () => {
    const { container } = renderPage();
    const form = container.querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Un nombre" },
    });
    fireEvent.submit(form);
    expect(screen.getByRole("heading", { name: "Registro" })).toBeDefined();
    expect(screen.getByLabelText("Nombre")).toHaveProperty("value", "Un nombre");
    expect(screen.queryByText(/error/i)).toBeNull();
  });
});