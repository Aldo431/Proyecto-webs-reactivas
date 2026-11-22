import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartSummary } from "./CartSummary.tsx";

const quote = {
  subtotal: 12000,
  discounts: [],
  total: 9600,
  savings: 2400,
};

describe("CartSummary", () => {
  it("muestra el estado de carga", () => {
    render(<CartSummary state={{ status: "loading" }} />);
    expect(screen.getByRole("status").textContent).toContain(
      "Calculando precio",
    );
  });

  it("muestra los montos calculados por el servidor", () => {
    render(<CartSummary state={{ status: "success", quote }} />);

    expect(screen.getByText("Subtotal")).toBeDefined();
    expect(screen.getByText("$12.000")).toBeDefined();
    expect(screen.getByText("$9.600")).toBeDefined();
    expect(screen.getByText("$2.400")).toBeDefined();
  });

  it("muestra el error sin falsos montos en cero", () => {
    render(
      <CartSummary
        state={{ status: "error", message: "No se pudo calcular el precio." }}
      />,
    );

    expect(screen.getByRole("alert").textContent).toBe(
      "No se pudo calcular el precio.",
    );
    expect(screen.queryByText("$0")).toBeNull();
  });
});
