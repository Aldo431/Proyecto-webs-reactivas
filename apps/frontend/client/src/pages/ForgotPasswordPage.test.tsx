import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { ForgotPasswordPage } from "./ForgotPasswordPage.tsx";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/recuperar-clave"]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/recuperar-clave" element={<ForgotPasswordPage />} />
            <Route path="/iniciar-sesion" element={<h1>Iniciar sesión</h1>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ForgotPasswordPage", () => {
  it("renders the email form and login link", async () => {
    stubAuthFetch();
    renderPage();
    expect(await screen.findByLabelText("Correo electrónico")).toBeDefined();
    expect(screen.getByRole("button", { name: "Enviar enlace de restablecimiento" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Volver al inicio de sesión" }).getAttribute("href")).toBe("/iniciar-sesion");
  });

  it("validates invalid email, shows field error, and focuses the field", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    const email = await screen.findByLabelText("Correo electrónico");
    fireEvent.change(email, { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace de restablecimiento" }));
    expect(await screen.findByText("Correo electrónico inválido.")).toBeDefined();
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/auth/forgot-password", expect.anything());
  });

  it("shows the generic success message after the request", async () => {
    const routes = stubAuthFetch();
    routes["/api/auth/forgot-password"] = () =>
      jsonResponse(200, {
        message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
      });
    renderPage();
    fireEvent.change(await screen.findByLabelText("Correo electrónico"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace de restablecimiento" }));
    expect((await screen.findByRole("status")).textContent).toContain(
      "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
    );
    expect(screen.getByRole("link", { name: "Volver al inicio de sesión" })).toBeDefined();
  });

  it("preserves email after rate limit and shows retry", async () => {
    const routes = stubAuthFetch();
    routes["/api/auth/forgot-password"] = () =>
      jsonResponse(429, { message: "Has excedido el límite de solicitudes. Intenta más tarde." });
    renderPage();
    const email = await screen.findByLabelText("Correo electrónico");
    fireEvent.change(email, { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace de restablecimiento" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Has excedido el límite de solicitudes. Intenta más tarde.");
    expect((email as HTMLInputElement).value).toBe("ana@example.com");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeDefined();
  });

  it("shows a network error and retries without losing the email", async () => {
    const routes = stubAuthFetch();
    routes["/api/auth/forgot-password"] = () => { throw new Error("offline"); };
    renderPage();
    const email = await screen.findByLabelText("Correo electrónico");
    fireEvent.change(email, { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace de restablecimiento" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No se pudo enviar el correo. Intenta más tarde.");
    expect((email as HTMLInputElement).value).toBe("ana@example.com");
  });
});
