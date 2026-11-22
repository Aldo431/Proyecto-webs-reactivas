import { describe, expect, it } from "vitest";
import {
  loginResponseSchema,
  mfaCodeSchema,
  mfaDisableInputSchema,
  mfaRequiredSchema,
  mfaVerifyInputSchema,
} from "./mfaSchemas.ts";

const user = {
  id: "u1",
  username: "ana",
  displayName: "Ana",
  email: "ana@uchile.cl",
  role: "user" as const,
};

describe("mfaSchemas", () => {
  it("valida códigos de seis dígitos", () => {
    expect(mfaCodeSchema.safeParse("123456").success).toBe(true);
    for (const code of ["12345", "1234567", "abcdef", "12 456", ""]) {
      expect(mfaCodeSchema.safeParse(code).success).toBe(false);
    }
  });

  it("valida entradas de verificación y desactivación", () => {
    expect(
      mfaVerifyInputSchema.safeParse({ challengeId: "c1", code: "123456" }).success,
    ).toBe(true);
    expect(mfaVerifyInputSchema.safeParse({ challengeId: "", code: "123456" }).success).toBe(false);
    expect(
      mfaDisableInputSchema.safeParse({
        challengeId: "c1",
        code: "123456",
        password: "clave123",
      }).success,
    ).toBe(true);
    expect(mfaDisableInputSchema.safeParse({ code: "123456" }).success).toBe(false);
  });

  it("acepta login con y sin 2FA y respuesta intermedia", () => {
    expect(loginResponseSchema.safeParse(user).success).toBe(true);
    expect(loginResponseSchema.safeParse({ ...user, mfaEnabled: true }).success).toBe(true);
    const challenge = {
      mfaRequired: true as const,
      challengeId: "c1",
      message: "Enviamos un código a tu correo.",
    };
    expect(loginResponseSchema.safeParse(challenge).success).toBe(true);
    expect(loginResponseSchema.safeParse({ ...challenge, devCode: "123456" }).success).toBe(true);
    expect(mfaRequiredSchema.safeParse(challenge).success).toBe(true);
  });
});
