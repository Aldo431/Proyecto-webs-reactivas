import { describe, expect, it, vi } from "vitest";
import {
  createResetToken,
  generateResetToken,
  resetPassword,
  validateResetToken,
  type ForgotPasswordDependencies,
  type ResetPasswordDependencies,
} from "./passwordResetService.ts";

const user = { _id: { toString: () => "user-1" }, email: "ana@example.com" };

function makeForgotDeps(
  overrides: Partial<ForgotPasswordDependencies> = {},
): ForgotPasswordDependencies {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(user),
    saveToken: vi.fn().mockResolvedValue(undefined),
    clearToken: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    getResetUrl: (token) => `https://shop.example/#/resetear-clave/${token}`,
    now: () => new Date("2026-10-17T12:00:00.000Z"),
    isDevelopment: false,
    ...overrides,
  };
}

function makeResetDeps(
  overrides: Partial<ResetPasswordDependencies> = {},
): ResetPasswordDependencies {
  return {
    findUserByToken: vi.fn().mockResolvedValue(user),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    clearToken: vi.fn().mockResolvedValue(undefined),
    hashPassword: vi.fn().mockResolvedValue("hashed-password"),
    now: () => new Date("2026-10-17T12:00:00.000Z"),
    ...overrides,
  };
}

describe("generateResetToken", () => {
  it("produces a unique 64-character hexadecimal token", () => {
    const first = generateResetToken();
    const second = generateResetToken();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
  });
});

describe("createResetToken", () => {
  it("returns the generic response and does not send email for an unknown address", async () => {
    const deps = makeForgotDeps({ findUserByEmail: vi.fn().mockResolvedValue(null) });
    const result = await createResetToken("missing@example.com", deps);
    expect(result).toEqual({
      ok: true,
      message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
    });
    expect(deps.saveToken).not.toHaveBeenCalled();
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("saves a 15-minute token and sends a reset link", async () => {
    const deps = makeForgotDeps();
    const result = await createResetToken(" ANA@EXAMPLE.COM ", deps);
    expect(result.ok).toBe(true);
    expect(deps.findUserByEmail).toHaveBeenCalledWith("ana@example.com");
    expect(deps.saveToken).toHaveBeenCalledWith(
      "user-1",
      expect.stringMatching(/^[a-f0-9]{64}$/),
      new Date("2026-10-17T12:15:00.000Z"),
    );
    expect(deps.sendEmail).toHaveBeenCalledWith(
      "ana@example.com",
      expect.stringMatching(/^https:\/\/shop\.example\/#\/resetear-clave\/[a-f0-9]{64}$/),
    );
  });

  it("returns the token only in development mode", async () => {
    const result = await createResetToken(
      "ana@example.com",
      makeForgotDeps({ isDevelopment: true }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.devToken).toMatch(/^[a-f0-9]{64}$/);
  });

  it("clears the token and returns an error if delivery fails", async () => {
    const deps = makeForgotDeps({
      sendEmail: vi.fn().mockRejectedValue(new Error("SMTP unavailable")),
    });
    const result = await createResetToken("ana@example.com", deps);
    expect(result).toMatchObject({
      ok: false,
      reason: "error",
      message: "No se pudo enviar el correo. Intenta más tarde.",
    });
    expect(deps.clearToken).toHaveBeenCalledWith("user-1");
  });
});

describe("validateResetToken", () => {
  it("returns true when an unexpired token is found", async () => {
    const deps = makeResetDeps();
    await expect(validateResetToken("a".repeat(64), deps)).resolves.toBe(true);
  });

  it("returns false when the token is not found", async () => {
    const deps = makeResetDeps({ findUserByToken: vi.fn().mockResolvedValue(null) });
    await expect(validateResetToken("a".repeat(64), deps)).resolves.toBe(false);
  });
});

describe("resetPassword", () => {
  it("updates the password and clears the one-time token", async () => {
    const deps = makeResetDeps();
    const result = await resetPassword("a".repeat(64), "new-password", deps);
    expect(result.ok).toBe(true);
    expect(deps.hashPassword).toHaveBeenCalledWith("new-password");
    expect(deps.updatePassword).toHaveBeenCalledWith("user-1", "hashed-password");
    expect(deps.clearToken).toHaveBeenCalledWith("user-1");
  });

  it("rejects an expired or unknown token without changing the password", async () => {
    const deps = makeResetDeps({ findUserByToken: vi.fn().mockResolvedValue(null) });
    const result = await resetPassword("a".repeat(64), "new-password", deps);
    expect(result).toMatchObject({ ok: false });
    expect(deps.hashPassword).not.toHaveBeenCalled();
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
});
