import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { resetAuthStore, useAuthStore } from "../stores/authStore.ts";
import { MfaVerifyPage } from "./MfaVerifyPage.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  role: "user" as const,
  studentVerified: false,
  mfaEnabled: true,
};

function renderPage(entry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/verificar-clave" element={<MfaVerifyPage />} />
        <Route path="/iniciar-sesion" element={<p>Iniciar sesión (sonda)</p>} />
        <Route path="/perfil" element={<p>Perfil (sonda)</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetAuthStore();
  useAuthStore.setState({ state: { status: "anonymous", user: null } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAuthStore();
});

describe("MfaVerifyPage", () => {
  it("redirige a iniciar sesión sin un desafío", async () => {
    renderPage("/verificar-clave");
    expect(await screen.findByText("Iniciar sesión (sonda)")).toBeDefined();
  });

  it("muestra el código de desarrollo recibido en la navegación", async () => {
    renderPage({
      pathname: "/verificar-clave",
      state: {
        challengeId: "challenge-1",
        from: "/perfil",
        devCode: "123456",
      },
    });

    expect(await screen.findByRole("button", { name: "Verificar código" })).toBeDefined();
    expect(screen.getByText("Código de desarrollo: 123456")).toBeDefined();
  });

  it("verifica el código y vuelve a la ruta de origen", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, okUser));
    vi.stubGlobal("fetch", fetchMock);

    renderPage({
      pathname: "/verificar-clave",
      state: { challengeId: "challenge-1", from: "/perfil" },
    });

    fireEvent.change(await screen.findByLabelText("Código de verificación"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(await screen.findByText("Perfil (sonda)")).toBeDefined();
    expect(useAuthStore.getState().state).toEqual({
      status: "authenticated",
      user: okUser,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/auth/mfa/verify");
    expect(JSON.parse(init.body as string)).toEqual({
      challengeId: "challenge-1",
      code: "123456",
    });
  });

  it("valida el código localmente y permite reenviarlo", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/mfa/resend") {
        return jsonResponse(202, {
          message: "Código reenviado.",
          devCode: "654321",
        });
      }
      return jsonResponse(400, {});
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage({
      pathname: "/verificar-clave",
      state: { challengeId: "challenge-1", from: "/perfil" },
    });

    const field = await screen.findByLabelText("Código de verificación");
    fireEvent.change(field, { target: { value: "12ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar código" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toBe(
      "El código debe tener 6 dígitos.",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar código" }));
    await waitFor(() => {
      expect(screen.getAllByRole("alert")[0]?.textContent).toContain(
        "El código de verificación es inválido o ha expirado.",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Reenviar código" }));
    expect(await screen.findByRole("status")).toBeDefined();
    expect(screen.getByText("Código reenviado.")).toBeDefined();
    expect(screen.getByText("Código de desarrollo: 654321")).toBeDefined();
  });
});
