import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import {
  confirmMfaEnable,
  disableMfa,
  requestMfaDisable,
  requestMfaEnable,
  resendMfaCode,
  verifyMfaLogin,
} from "./mfaApi.ts";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  role: "user",
  studentVerified: false,
  mfaEnabled: true,
};

function requestBody(fetchMock: Mock): unknown {
  const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(init[1].body as string);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mfaApi", () => {
  it("pide un desafío para activar y desactivar", async () => {
    for (const [call, url] of [
      [requestMfaEnable, "/api/auth/mfa/enable"],
      [requestMfaDisable, "/api/auth/mfa/disable/request"],
    ] as const) {
      const fetchMock = vi.fn(async () =>
        jsonResponse(202, {
          challengeId: "challenge-1",
          message: "Código enviado.",
          devCode: "123456",
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      expect(await call()).toEqual({
        ok: true,
        challengeId: "challenge-1",
        message: "Código enviado.",
        devCode: "123456",
      });
      const [requestUrl, init] = fetchMock.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(requestUrl).toBe(url);
      expect(init.method).toBe("POST");
      expect(init.credentials).toBe("include");
      expect(requestBody(fetchMock)).toEqual({});
    }
  });

  it("confirma la activación y valida el código localmente", async () => {
    const invalidFetch = vi.fn();
    vi.stubGlobal("fetch", invalidFetch);
    expect(await confirmMfaEnable("challenge-1", "12ab")).toEqual({
      ok: false,
      message: "El código debe tener 6 dígitos.",
      fieldErrors: { code: "El código debe tener 6 dígitos." },
    });
    expect(invalidFetch).not.toHaveBeenCalled();

    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { message: "Verificación activada." }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await confirmMfaEnable("challenge-1", "123456")).toEqual({
      ok: true,
      message: "Verificación activada.",
    });
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/mfa/enable/confirm");
    expect(requestBody(fetchMock)).toEqual({
      challengeId: "challenge-1",
      code: "123456",
    });
  });

  it("desactiva enviando la contraseña actual", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { message: "Verificación desactivada." }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await disableMfa("challenge-1", "123456", "claveActual1")).toEqual({
      ok: true,
      message: "Verificación desactivada.",
    });
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/mfa/disable");
    expect(requestBody(fetchMock)).toEqual({
      challengeId: "challenge-1",
      code: "123456",
      password: "claveActual1",
    });
  });

  it("reenvía el código con un desafío válido", async () => {
    const invalidFetch = vi.fn();
    vi.stubGlobal("fetch", invalidFetch);
    expect(await resendMfaCode("")).toEqual({
      ok: false,
      message: "Identificador de desafío inválido.",
      fieldErrors: { challengeId: "Identificador de desafío inválido." },
    });
    expect(invalidFetch).not.toHaveBeenCalled();

    const fetchMock = vi.fn(async () =>
      jsonResponse(202, { message: "Código reenviado.", devCode: "654321" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await resendMfaCode("challenge-1")).toEqual({
      ok: true,
      message: "Código reenviado.",
      devCode: "654321",
    });
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/mfa/resend");
    expect(requestBody(fetchMock)).toEqual({ challengeId: "challenge-1" });
  });

  it("verifica el segundo paso y devuelve el usuario", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, okUser));
    vi.stubGlobal("fetch", fetchMock);

    expect(await verifyMfaLogin("challenge-1", "123456")).toEqual({
      ok: true,
      user: okUser,
    });
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/mfa/verify");
    expect(requestBody(fetchMock)).toEqual({
      challengeId: "challenge-1",
      code: "123456",
    });
  });

  it("traduce los estados de error y los fallos de red", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(429, {})));
    expect(await requestMfaEnable()).toEqual({
      ok: false,
      message: "Has excedido el límite de intentos. Intenta más tarde.",
    });

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(400, {})));
    expect(await verifyMfaLogin("challenge-1", "123456")).toEqual({
      ok: false,
      message: "El código de verificación es inválido o ha expirado.",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("sin red");
      }),
    );
    expect(await requestMfaEnable()).toEqual({
      ok: false,
      message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    });
  });
});
