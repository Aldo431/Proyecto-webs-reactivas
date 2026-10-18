import { describe, expect, it } from "vitest";
import {
  forgotPasswordInputSchema,
  loginInputSchema,
  publicUserSchema,
  registerInputSchema,
  registerRequestSchema,
  resetPasswordInputSchema,
} from "./authSchemas.ts";

const validRegister = {
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  password: "secreto123",
  passwordConfirm: "secreto123",
};

describe("registerInputSchema", () => {
  it("acepta un registro válido", () => {
    expect(registerInputSchema.safeParse(validRegister).success).toBe(true);
  });

  it("recorta espacios y normaliza el username a minúsculas", () => {
    const result = registerInputSchema.safeParse({
      ...validRegister,
      username: "  AnaPerez  ",
      displayName: "  Ana Pérez  ",
      email: "  ana@dcc.uchile.cl  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("anaperez");
      expect(result.data.displayName).toBe("Ana Pérez");
      expect(result.data.email).toBe("ana@dcc.uchile.cl");
    }
  });

  it("rechaza un correo mal formado", () => {
    expect(
      registerInputSchema.safeParse({ ...validRegister, email: "ana@" })
        .success,
    ).toBe(false);
  });

  it("rechaza un username vacío o solo con espacios", () => {
    expect(
      registerInputSchema.safeParse({ ...validRegister, username: "   " })
        .success,
    ).toBe(false);
  });

  it("rechaza un username de más de 80 caracteres", () => {
    expect(
      registerInputSchema.safeParse({
        ...validRegister,
        username: "a".repeat(81),
      }).success,
    ).toBe(false);
  });

  it("rechaza un displayName vacío", () => {
    expect(
      registerInputSchema.safeParse({ ...validRegister, displayName: "  " })
        .success,
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
      username: "anaperez",
      displayName: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
    });

    expect(result.success).toBe(true);
  });

  it("ignora campos desconocidos como passwordHash", () => {
    const result = publicUserSchema.safeParse({
      id: "6712a4f3c9b1e24a8f0d1234",
      username: "anaperez",
      displayName: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      passwordHash: "$2b$10$hash",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("passwordHash");
    }
  });
});

describe("forgotPasswordInputSchema", () => {
  it("acepta un correo electrónico válido", () => {
    const result = forgotPasswordInputSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un correo electrónico inválido", () => {
    const result = forgotPasswordInputSchema.safeParse({
      email: "correo-invalido",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Correo electrónico inválido."
      );
    }
  });

  it("rechaza un correo electrónico vacío", () => {
    const result = forgotPasswordInputSchema.safeParse({
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("recorta espacios y rechaza correos sobre 255 caracteres", () => {
    const trimmed = forgotPasswordInputSchema.safeParse({
      email: "  ana@example.com  ",
    });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.email).toBe("ana@example.com");

    expect(
      forgotPasswordInputSchema.safeParse({
        email: `${"a".repeat(244)}@example.com`,
      }).success,
    ).toBe(false);
  });
});

describe("resetPasswordInputSchema", () => {
  const validToken = "a".repeat(64);

  it("acepta un token válido de 64 caracteres hexadecimales", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: validToken,
      password: "nuevaPassword123",
    });
    expect(result.success).toBe(true);
  });

  it("acepta un token con caracteres hexadecimales mixtos", () => {
    const mixedToken = "abcdef0123456789".repeat(4);
    const result = resetPasswordInputSchema.safeParse({
      token: mixedToken,
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un token de 63 caracteres", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: "a".repeat(63),
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "El token de restablecimiento no es válido."
      );
    }
  });

  it("rechaza un token de 65 caracteres", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: "a".repeat(65),
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "El token de restablecimiento no es válido."
      );
    }
  });

  it("rechaza un token con caracteres no hexadecimales", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: "g".repeat(64),
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "El token de restablecimiento no es válido."
      );
    }
  });

  it("rechaza un token con caracteres especiales", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: "a".repeat(63) + "-",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("acepta una contraseña de 8 caracteres", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: validToken,
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("acepta una contraseña de 100 caracteres", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: validToken,
      password: "a".repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it("rechaza una contraseña de 7 caracteres", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: validToken,
      password: "1234567",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "La contraseña debe tener al menos 8 caracteres."
      );
    }
  });

  it("rechaza una contraseña de 101 caracteres", () => {
    const result = resetPasswordInputSchema.safeParse({
      token: validToken,
      password: "a".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "La contraseña no puede superar los 100 caracteres."
      );
    }
  });
});
