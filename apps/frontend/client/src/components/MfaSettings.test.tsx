import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { resetAuthStore, useAuthStore } from "../stores/authStore.ts";
import { MfaSettings } from "./MfaSettings.tsx";

const baseUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  role: "user" as const,
  studentVerified: false,
  mfaEnabled: false,
};

function bodyOf(fetchMock: Mock, url: string): unknown {
  const call = fetchMock.mock.calls.find(
    (entry) => String((entry as unknown as [string])[0]) === url,
  ) as unknown as [string, RequestInit] | undefined;
  return JSON.parse(call?.[1].body as string);
}

beforeEach(() => {
  resetAuthStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAuthStore();
});

describe("MfaSettings", () => {
  it("no se muestra para visitantes", () => {
    useAuthStore.setState({ state: { status: "anonymous", user: null } });
    const { container } = render(<MfaSettings />);
    expect(container.firstChild).toBeNull();
  });

  it("activa la verificación en dos pasos", async () => {
    useAuthStore.setState({
      state: { status: "authenticated", user: baseUser },
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/mfa/enable") {
        return jsonResponse(202, {
          challengeId: "challenge-1",
          message: "Revisa tu correo.",
          devCode: "654321",
        });
      }
      if (url === "/api/auth/mfa/enable/confirm") {
        return jsonResponse(200, { message: "Verificación activada." });
      }
      if (url === "/api/auth/me") {
        return jsonResponse(200, { ...baseUser, mfaEnabled: true });
      }
      throw new Error(`Sin respuesta simulada para ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MfaSettings />);

    expect(screen.getByText("Desactivada")).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Activar verificación en dos pasos",
      }),
    );

    expect(await screen.findByRole("status")).toBeDefined();
    expect(screen.getByText("Código de desarrollo: 654321")).toBeDefined();
    expect(bodyOf(fetchMock, "/api/auth/mfa/enable")).toEqual({});

    fireEvent.change(screen.getByLabelText("Código de verificación"), {
      target: { value: "654321" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar activación" }),
    );

    await waitFor(() => {
      expect(useAuthStore.getState().state.status).toBe("authenticated");
    });
    expect(
      (useAuthStore.getState().state as { user: { mfaEnabled: boolean } }).user
        .mfaEnabled,
    ).toBe(true);
    expect(screen.getByText("Verificación activada.")).toBeDefined();
    expect(screen.getByText("Activada")).toBeDefined();
    expect(bodyOf(fetchMock, "/api/auth/mfa/enable/confirm")).toEqual({
      challengeId: "challenge-1",
      code: "654321",
    });
  });

  it("pide la contraseña para desactivar la verificación", async () => {
    useAuthStore.setState({
      state: {
        status: "authenticated",
        user: { ...baseUser, mfaEnabled: true },
      },
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/mfa/disable/request") {
        return jsonResponse(202, {
          challengeId: "challenge-2",
          message: "Revisa tu correo.",
        });
      }
      if (url === "/api/auth/mfa/disable") {
        return jsonResponse(200, { message: "Verificación desactivada." });
      }
      if (url === "/api/auth/me") {
        return jsonResponse(200, baseUser);
      }
      throw new Error(`Sin respuesta simulada para ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MfaSettings />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Desactivar verificación en dos pasos",
      }),
    );
    expect(await screen.findByLabelText("Contraseña actual")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Código de verificación"), {
      target: { value: "111222" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "claveActual1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar desactivación" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Verificación desactivada.")).toBeDefined();
    });
    expect(screen.getByText("Desactivada")).toBeDefined();
    expect(bodyOf(fetchMock, "/api/auth/mfa/disable")).toEqual({
      challengeId: "challenge-2",
      code: "111222",
      password: "claveActual1",
    });
  });

  it("muestra errores de solicitud sin abrir el formulario", async () => {
    useAuthStore.setState({
      state: { status: "authenticated", user: baseUser },
    });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(429, {})));

    render(<MfaSettings />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Activar verificación en dos pasos",
      }),
    );

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain(
      "Has excedido el límite de intentos",
    );
    expect(screen.queryByLabelText("Código de verificación")).toBeNull();
  });
});
