import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterPage } from "./RegisterPage.tsx";

describe("RegisterPage", () => {
  it("shows the four required fields", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText("Nombre")).toBeDefined();
    expect(screen.getByLabelText("Correo electrónico")).toBeDefined();
    expect(screen.getByLabelText("Contraseña")).toBeDefined();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeDefined();
  });

  it("does not validate, submit or navigate on submit", () => {
    const { container } = render(<RegisterPage />);
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