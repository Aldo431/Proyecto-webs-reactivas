import { describe, expect, it } from "vitest";
import {
  loginInputSchema,
  publicUserSchema,
  registerInputSchema,
  registerRequestSchema,
} from "./authSchemas.ts";

const validRegister = {
  name: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  password: "secreto123",
  passwordConfirm: "secreto123",
};

describe("registerInputSchema", () => {
  it("acepta un registro válido", () => {
    expect(registerInputSchema.safeParse(validRegister).success).toBe(true);
  });

  it("recorta espacios de nombre y correo", () => {
    const result = registerInputSchema.safeParse({
      ...validRegister,
      name: "  Ana Pérez  ",
      email: "  ana@dcc.uchile.cl  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ana Pérez");
      expect(result.data.email).toBe("ana@dcc.uchile.cl");
    }
  });

  it("rechaza un correo mal formado", () => {
    expect(
      registerInputSchema.safeParse({ ...validRegister, email: "ana@" })
        .success,
    ).toBe(false);
  });

  it("rechaza un nombre vacío o solo con espacios", () => {
    expect(
      registerInputSchema.safeParse({ ...validRegister, name: "   " }).success,
    ).toBe(false);
  });

  it("rechaza una contraseña de 7 caracteres", () => {
    const result = registerInputSchema.safeParse({
      ...validRegister,
      password: "1234567",
      passwordConfirm: "1234567",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza una contraseña de 101 caracteres", () => {
    const longPassword = "a".repeat(101);
    const result = registerInputSchema.safeParse({
      ...validRegister,
      password: longPassword,
      passwordConfirm: longPassword,
    });

    expect(result.success).toBe(false);
  });

  it("acepta contraseñas de 8 y de 100 caracteres", () => {
    const eight = "a".repeat(8);
    const hundred = "a".repeat(100);

    expect(
      registerInputSchema.safeParse({
        ...validRegister,
        password: eight,
        passwordConfirm: eight,
      }).success,
    ).toBe(true);
    expect(
      registerInputSchema.safeParse({
        ...validRegister,
        password: hundred,
        passwordConfirm: hundred,
      }).success,
    ).toBe(true);
  });

  it("rechaza una confirmación distinta de la contraseña", () => {
    const result = registerInputSchema.safeParse({
      ...validRegister,
      passwordConfirm: "distinta123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["passwordConfirm"]);
    }
  });
});

describe("registerRequestSchema", () => {
  it("acepta el cuerpo de registro sin confirmación", () => {
    const { passwordConfirm: _ignored, ...request } = validRegister;
    expect(registerRequestSchema.safeParse(request).success).toBe(true);
  });

  it("ignora campos desconocidos y la confirmación (sin mass assignment)", () => {
    const result = registerRequestSchema.safeParse({
      ...validRegister,
      isAdmin: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("passwordConfirm");
      expect(result.data).not.toHaveProperty("isAdmin");
    }
  });
});

describe("loginInputSchema", () => {
  it("acepta credenciales válidas", () => {
    expect(
      loginInputSchema.safeParse({
        email: "ana@dcc.uchile.cl",
        password: "secreto123",
      }).success,
    ).toBe(true);
  });

  it("rechaza un correo inválido", () => {
    expect(
      loginInputSchema.safeParse({ email: "no-es-correo", password: "x" })
        .success,
    ).toBe(false);
  });

  it("rechaza una contraseña vacía", () => {
    expect(
      loginInputSchema.safeParse({
        email: "ana@dcc.uchile.cl",
        password: "",
      }).success,
    ).toBe(false);
  });
});

describe("publicUserSchema", () => {
  it("acepta el contrato público del usuario", () => {
    const result = publicUserSchema.safeParse({
      id: "6712a4f3c9b1e24a8f0d1234",
      name: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
    });

    expect(result.success).toBe(true);
  });

  it("ignora campos desconocidos como passwordHash", () => {
    const result = publicUserSchema.safeParse({
      id: "6712a4f3c9b1e24a8f0d1234",
      name: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      passwordHash: "$2b$10$hash",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("passwordHash");
    }
  });
});
