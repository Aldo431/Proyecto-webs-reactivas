import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { confirmStudentCode, requestStudentCode } from "./studentApi.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestStudentCode", () => {
  it("valida el correo antes de llamar a la API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestStudentCode("ana@gmail.com");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("institucionales");
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("envía el correo normalizado y devuelve el código de desarrollo", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(202, {
        message: "Código enviado.",
        devCode: "123456",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestStudentCode("  ANA@UCHILE.CL ");

    expect(result).toEqual({
      ok: true,
      message: "Código enviado.",
      devCode: "123456",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/students/verify");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      email: "ana@uchile.cl",
    });
  });

  it("devuelve mensajes en español según el estado", async () => {
    const cases = [
      [401, "Inicia sesión para verificar tu correo."],
      [429, "Has excedido el límite de solicitudes. Intenta más tarde."],
      [
        503,
        "El servicio no está disponible en este momento. Inténtalo más tarde.",
      ],
      [500, "No se pudo enviar el código. Intenta más tarde."],
    ] as const;

    for (const [status, message] of cases) {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(status, {})));
      const result = await requestStudentCode("ana@uchile.cl");
      expect(result).toEqual({ ok: false, message });
    }
  });

  it("usa el mensaje del servidor cuando viene en el cuerpo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(429, { message: "Espera 5 minutos." })),
    );

    const result = await requestStudentCode("ana@uchile.cl");

    expect(result).toEqual({ ok: false, message: "Espera 5 minutos." });
  });

  it("reporta una respuesta inesperada y fallos de red", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(202, {})));
    expect(await requestStudentCode("ana@uchile.cl")).toEqual({
      ok: false,
      message: "El servidor devolvió una respuesta inesperada.",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("sin red");
      }),
    );
    expect(await requestStudentCode("ana@uchile.cl")).toEqual({
      ok: false,
      message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    });
  });
});

describe("confirmStudentCode", () => {
  it("valida seis dígitos antes de llamar a la API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await confirmStudentCode("12ab");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("El código debe tener 6 dígitos.");
      expect(result.fieldErrors?.code).toBe("El código debe tener 6 dígitos.");
    }
  });

  it("confirma el código por POST con credenciales", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { message: "Correo verificado." }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await confirmStudentCode("123456");

    expect(result).toEqual({ ok: true, message: "Correo verificado." });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/students/confirm");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ code: "123456" });
  });

  it("devuelve el error de validación del servidor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(400, {
          message: "Código inválido.",
          fieldErrors: { code: "Revisa el código." },
        }),
      ),
    );

    const result = await confirmStudentCode("123456");

    expect(result).toEqual({
      ok: false,
      message: "Código inválido.",
      fieldErrors: { code: "Revisa el código." },
    });
  });
});
