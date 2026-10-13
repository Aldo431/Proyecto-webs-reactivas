import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { RegisterPage } from "./RegisterPage.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  name: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/registro"]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/" element={<div>Inicio</div>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Ana Pérez" },
  });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "ana@dcc.uchile.cl" },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "secreto123" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
    target: { value: "secreto123" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RegisterPage", () => {
  it("shows the four required fields", async () => {
    stubAuthFetch();
    renderPage();
    expect(await screen.findByLabelText("Nombre")).toBeDefined();
    expect(screen.getByLabelText("Correo electrónico")).toBeDefined();
    expect(screen.getByLabelText("Contraseña")).toBeDefined();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeDefined();
  });

  it("validates locally and keeps the entered data", async () => {
    stubAuthFetch();
    renderPage();

    fireEvent.change(await screen.findByLabelText("Nombre"), {
      target: { value: "Un nombre" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(
      await screen.findByText("Ingresa un correo electrónico válido."),
    ).toBeDefined();
    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeDefined();
    expect(screen.getByText("Confirma tu contraseña.")).toBeDefined();
    expect(screen.getByLabelText("Nombre")).toHaveProperty("value", "Un nombre");
    expect(
      screen.queryByText("No se pudo conectar con el servidor. Inténtalo de nuevo."),
    ).toBeNull();
  });

  it("rejects a password confirmation that does not match", async () => {
    stubAuthFetch();
    renderPage();

    fireEvent.change(await screen.findByLabelText("Nombre"), {
      target: { value: "Ana Pérez" },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "ana@dcc.uchile.cl" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "secreto123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
      target: { value: "otra12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(
      await screen.findByText("Las contraseñas no coinciden."),
    ).toBeDefined();
  });

  it("shows the 409 message in Spanish without losing the entered data", async () => {
    const routes = stubAuthFetch();
    routes["/api/auth/register"] = () =>
      jsonResponse(409, { message: "Ya existe una cuenta con ese correo." });
    renderPage();

    await screen.findByLabelText("Nombre");
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(
      await screen.findByText("Ya existe una cuenta con ese correo."),
    ).toBeDefined();
    expect(screen.getByLabelText("Correo electrónico")).toHaveProperty(
      "value",
      "ana@dcc.uchile.cl",
    );
  });

  it("registers, starts the session and navigates home", async () => {
    const routes = stubAuthFetch();
    routes["/api/auth/register"] = () => jsonResponse(201, okUser);
    renderPage();

    await screen.findByLabelText("Nombre");
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(await screen.findByText("Inicio")).toBeDefined();
  });
});
