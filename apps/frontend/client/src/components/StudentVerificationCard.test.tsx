import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { STUDENT_EMAIL_REQUIREMENT } from "../logic/promotionFormat.ts";
import { jsonResponse } from "../test/authMocks.ts";
import { StudentVerificationCard } from "./StudentVerificationCard.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StudentVerificationCard", () => {
  it("no ofrece verificación para correos que no son de alumno", () => {
    render(
      <StudentVerificationCard
        email="ana@gmail.com"
        studentVerified={false}
        onVerified={() => undefined}
      />,
    );

    expect(screen.getByText(STUDENT_EMAIL_REQUIREMENT)).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Enviar código a mi correo" }),
    ).toBeNull();
  });

  it("ofrece verificación para subdominios institucionales como ug.uchile.cl", () => {
    render(
      <StudentVerificationCard
        email="ana@ug.uchile.cl"
        studentVerified={false}
        onVerified={() => undefined}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Enviar código a mi correo" }),
    ).toBeDefined();
  });

  it("muestra el descuento activo cuando ya está verificado", () => {
    render(
      <StudentVerificationCard
        email="ana@uchile.cl"
        studentVerified
        onVerified={() => undefined}
      />,
    );

    expect(screen.getByText("Alumno verificado")).toBeDefined();
    expect(screen.getByText("Tu descuento de alumno está activo.")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Enviar código a mi correo" }),
    ).toBeNull();
  });

  it("envía el código, valida la entrada y confirma la verificación", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/students/verify") {
        return jsonResponse(202, {
          message: "Revisa tu correo.",
          devCode: "123456",
        });
      }
      if (String(input) === "/api/students/confirm") {
        return jsonResponse(200, { message: "Correo verificado." });
      }
      throw new Error(`Sin respuesta simulada para ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const onVerified = vi.fn();

    render(
      <StudentVerificationCard
        email="ana@uchile.cl"
        studentVerified={false}
        onVerified={onVerified}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enviar código a mi correo" }),
    );
    expect(await screen.findByRole("status")).toBeDefined();
    expect(screen.getByText("Revisa tu correo.")).toBeDefined();
    expect(screen.queryByText(/Código de desarrollo:/)).toBeNull();

    const requestCall = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(requestCall[1].body as string)).toEqual({
      email: "ana@uchile.cl",
    });

    fireEvent.change(screen.getByLabelText("Código de verificación"), {
      target: { value: "12ab" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar código" }),
    );
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toBe(
      "El código debe tener 6 dígitos.",
    );
    expect(onVerified).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Código de verificación"), {
      target: { value: "123456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar código" }),
    );

    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Correo verificado.")).toBeDefined();
    const confirmCall = (
      fetchMock as Mock
    ).mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(JSON.parse(confirmCall[1].body as string)).toEqual({
      code: "123456",
    });
  });

  it("muestra el error del envío", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(503, {})),
    );

    render(
      <StudentVerificationCard
        email="ana@uchile.cl"
        studentVerified={false}
        onVerified={() => undefined}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enviar código a mi correo" }),
    );

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain(
      "El servicio no está disponible",
    );
  });
});
