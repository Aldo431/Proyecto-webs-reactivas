import { loginInputSchema, registerInputSchema } from "@tiendadcc/utils";
import { describe, expect, it } from "vitest";
import { issuesToFieldErrors } from "./formErrors.ts";

describe("issuesToFieldErrors", () => {
  it("asocia cada mensaje en español a su campo", () => {
    const result = loginInputSchema.safeParse({ email: "no-es-correo", password: "" });
    if (result.success) throw new Error("se esperaba un error de validación");

    expect(issuesToFieldErrors(result.error)).toEqual({
      email: "Ingresa un correo electrónico válido.",
      password: "Ingresa tu contraseña.",
    });
  });

  it("ubica la confirmación distinta en passwordConfirm", () => {
    const result = registerInputSchema.safeParse({
      name: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      password: "secreto123",
      passwordConfirm: "otra12345",
    });
    if (result.success) throw new Error("se esperaba un error de validación");

    expect(issuesToFieldErrors(result.error)).toEqual({
      passwordConfirm: "Las contraseñas no coinciden.",
    });
  });

  it("recorta el nombre y reporta el vacío", () => {
    const result = registerInputSchema.safeParse({
      name: "   ",
      email: "ana@dcc.uchile.cl",
      password: "secreto123",
      passwordConfirm: "secreto123",
    });
    if (result.success) throw new Error("se esperaba un error de validación");

    expect(issuesToFieldErrors(result.error)).toEqual({
      name: "El nombre es obligatorio.",
    });
  });
});
