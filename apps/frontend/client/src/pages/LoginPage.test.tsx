import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { LoginPage } from "./LoginPage.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  name: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/iniciar-sesion"]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="/" element={<div>Inicio</div>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("shows the two required fields", async () => {
    stubAuthFetch();
    renderPage();
    expect(await screen.findByLabelText("Correo electrónico")).toBeDefined();
    expect(screen.getByLabelText("Contraseña")).toBeDefined();
  });

  it("shows per-field errors and does not send the request", async () => {
    stubAuthFetch();
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Iniciar sesión" }),
    );

    expect(
      await screen.findByText("Ingresa un correo electrónico válido."),
    ).toBeDefined();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeDefined();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(
      screen.queryByText("No se pudo conectar con el servidor. Inténtalo de nuevo."),
    ).toBeNull();
  });

  it("associates the error with the field via aria attributes", async () => {
    stubAuthFetch();
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Iniciar sesión" }),
    );

    const email = await screen.findByLabelText("Correo electrónico");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    const describedBy = email.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? "")?.textContent).toBe(
      "Ingresa un correo electrónico válido.",
    );
  });

  it("clears a field error once the user edits that field", async () => {
    stubAuthFetch();
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Iniciar sesión" }),
    );
    expect(
      await screen.findByText("Ingresa un correo electrónico válido."),
    ).toBeDefined();

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "ana@dcc.uchile.cl" },
    });
    expect(
      screen.queryByText("Ingresa un correo electrónico válido."),
    ).toBeNull();
  });

  it("shows the generic 401 message without losing the entered data", async () => {
    const routes = stubAuthFetch();
    routes["/api/auth/login"] = () =>
      jsonResponse(401, { message: "Correo o contraseña incorrectos." });
    renderPage();

    fireEvent.change(await screen.findByLabelText("Correo electrónico"), {
      target: { value: "ana@dcc.uchile.cl" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "incorrecta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(
      await screen.findByText("Correo o contraseña incorrectos."),
    ).toBeDefined();
    expect(screen.getByLabelText("Correo electrónico")).toHaveProperty(
      "value",
      "ana@dcc.uchile.cl",
    );
    expect(screen.getByLabelText("Contraseña")).toHaveProperty(
      "value",
      "incorrecta",
    );
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveLogin!: () => void;
    const routes = stubAuthFetch();
    routes["/api/auth/login"] = () =>
      new Promise<Response>((resolve) => {
        resolveLogin = () => resolve(jsonResponse(200, okUser));
      });
    renderPage();

    fireEvent.change(await screen.findByLabelText("Correo electrónico"), {
      target: { value: "ana@dcc.uchile.cl" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "secreto123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Iniciar sesión" })).toHaveProperty(
        "disabled",
        true,
      );
    });

    await act(async () => {
      resolveLogin();
    });
    expect(await screen.findByText("Inicio")).toBeDefined();
  });

  it("authenticates and navigates home on success", async () => {
    const routes = stubAuthFetch();
    routes["/api/auth/login"] = () => jsonResponse(200, okUser);
    renderPage();

    fireEvent.change(await screen.findByLabelText("Correo electrónico"), {
      target: { value: "ana@dcc.uchile.cl" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "secreto123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Inicio")).toBeDefined();
  });
});
