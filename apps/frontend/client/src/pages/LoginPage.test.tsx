import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LoginPage } from "./LoginPage.tsx";

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  it("shows the two required fields", () => {
    renderPage();
    expect(screen.getByLabelText("Correo electrónico")).toBeDefined();
    expect(screen.getByLabelText("Contraseña")).toBeDefined();
  });

  it("does not validate, submit or navigate on submit", () => {
    const { container } = renderPage();
    const form = container.querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeDefined();
    expect(screen.queryByText(/error/i)).toBeNull();
  });
});