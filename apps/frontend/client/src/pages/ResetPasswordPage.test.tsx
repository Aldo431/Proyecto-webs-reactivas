import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { LoginPage } from "./LoginPage.tsx";
import { ResetPasswordPage } from "./ResetPasswordPage.tsx";

const token = "a".repeat(64);

function renderPage(path = `/resetear-clave/${token}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/resetear-clave/:token" element={<ResetPasswordPage />} />
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="/recuperar-clave" element={<h1>Recuperar contraseña</h1>} />
            <Route path="/" element={<h1>Inicio</h1>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ResetPasswordPage", () => {
  it("does not call the API or show the form for a malformed token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderPage("/resetear-clave/token-invalido");
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("link", { name: "Solicitar otro enlace" })).toBeDefined();
    expect(screen.queryByLabelText("Nueva contraseña")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/me");
  });

  it("validates the token on load and shows password fields for a valid token", async () => {
    const routes = stubAuthFetch();
    routes[`/api/auth/validate-reset-token/${token}`] = () =>
      jsonResponse(200, { valid: true });
    renderPage();
    expect(await screen.findByLabelText("Nueva contraseña")).toBeDefined();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeDefined();
  });

  it("hides the form when the backend reports an expired or unknown token", async () => {
    const routes = stubAuthFetch();
    routes[`/api/auth/validate-reset-token/${token}`] = () =>
      jsonResponse(200, { valid: false });
    renderPage();
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.queryByLabelText("Nueva contraseña")).toBeNull();
  });

  it("shows a mismatch error, focuses confirmation, and sends no reset request", async () => {
    const routes = stubAuthFetch();
    routes[`/api/auth/validate-reset-token/${token}`] = () =>
      jsonResponse(200, { valid: true });
    const fetchMock = vi.mocked(globalThis.fetch);
    renderPage();
    fireEvent.change(await screen.findByLabelText("Nueva contraseña"), {
      target: { value: "newPassword123" },
    });
    const confirmation = screen.getByLabelText("Confirmar contraseña");
    fireEvent.change(confirmation, { target: { value: "different123" } });
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeDefined();
    await waitFor(() => expect(document.activeElement).toBe(confirmation));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/auth/reset-password", expect.anything());
  });

  it("validates password length before sending", async () => {
    const routes = stubAuthFetch();
    routes[`/api/auth/validate-reset-token/${token}`] = () =>
      jsonResponse(200, { valid: true });
    renderPage();
    fireEvent.change(await screen.findByLabelText("Nueva contraseña"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
    expect(await screen.findByText("La contraseña debe tener al menos 8 caracteres.")).toBeDefined();
  });

  it("resets the password and displays the success notice on login", async () => {
    const routes = stubAuthFetch();
    routes[`/api/auth/validate-reset-token/${token}`] = () =>
      jsonResponse(200, { valid: true });
    routes["/api/auth/reset-password"] = () =>
      jsonResponse(200, { message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión." });
    renderPage();
    fireEvent.change(await screen.findByLabelText("Nueva contraseña"), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
    expect(await screen.findByRole("status")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain(
      "Contraseña restablecida con éxito. Ya puedes iniciar sesión.",
    );
  });

  it("offers retry after a network error without losing password values", async () => {
    const routes = stubAuthFetch();
    routes[`/api/auth/validate-reset-token/${token}`] = () =>
      jsonResponse(200, { valid: true });
    routes["/api/auth/reset-password"] = () => { throw new Error("offline"); };
    renderPage();
    const password = await screen.findByLabelText("Nueva contraseña");
    fireEvent.change(password, { target: { value: "newPassword123" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No se pudo restablecer la contraseña. Intenta más tarde.",
    );
    expect((password as HTMLInputElement).value).toBe("newPassword123");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeDefined();
  });
});
