import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoginPage } from "./LoginPage.tsx";

describe("LoginPage", () => {
  it("shows the two required fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Correo electrónico")).toBeDefined();
    expect(screen.getByLabelText("Contraseña")).toBeDefined();
  });

  it("does not validate, submit or navigate on submit", () => {
    const { container } = render(<LoginPage />);
    const form = container.querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeDefined();
    expect(screen.queryByText(/error/i)).toBeNull();
  });
});