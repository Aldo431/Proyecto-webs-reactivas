import crypto from "node:crypto";
import { User } from "../models/User.ts";
import { getEnv } from "../config/env.ts";
import { hashPassword } from "./authService.ts";
import { emailService } from "./emailService.ts";

const GENERIC_MESSAGE =
  "Si el correo existe, recibirás un enlace para restablecer tu contraseña.";
const INVALID_TOKEN_MESSAGE =
  "El enlace de restablecimiento es inválido o ha expirado.";
const RESET_SUCCESS_MESSAGE =
  "Contraseña restablecida con éxito. Ya puedes iniciar sesión.";
const TOKEN_LIFETIME_MS = 15 * 60 * 1000;

interface ResetUser {
  _id: { toString(): string };
  email: string;
}

export interface ForgotPasswordDependencies {
  findUserByEmail(email: string): Promise<ResetUser | null>;
  saveToken(userId: string, token: string, expiry: Date): Promise<void>;
  clearToken(userId: string): Promise<void>;
  sendEmail(to: string, resetUrl: string): Promise<void>;
  getResetUrl(token: string): string;
  now(): Date;
  isDevelopment: boolean;
}

export interface ResetPasswordDependencies {
  findUserByToken(token: string, now: Date): Promise<ResetUser | null>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  clearToken(userId: string): Promise<void>;
  hashPassword(password: string): Promise<string>;
  now(): Date;
}

const forgotPasswordDependencies: ForgotPasswordDependencies = {
  findUserByEmail: (email) => User.findOne({ email: email.trim().toLowerCase() }),
  saveToken: async (userId, token, expiry) => {
    await User.findByIdAndUpdate(userId, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
  },
  clearToken: async (userId) => {
    await User.findByIdAndUpdate(userId, {
      resetToken: null,
      resetTokenExpiry: null,
    });
  },
  sendEmail: (to, resetUrl) => emailService.sendPasswordResetEmail(to, resetUrl),
  getResetUrl: (token) =>
    `${getEnv().clientOrigin.replace(/\/$/, "")}/#/resetear-clave/${token}`,
  now: () => new Date(),
  isDevelopment: getEnv().nodeEnv === "development",
};

const resetPasswordDependencies: ResetPasswordDependencies = {
  findUserByToken: (token, now) =>
    User.findOne({ resetToken: token, resetTokenExpiry: { $gt: now } }),
  updatePassword: async (userId, passwordHash) => {
    await User.findByIdAndUpdate(userId, {
      $set: { passwordHash },
      $inc: { sessionVersion: 1 },
    });
  },
  clearToken: async (userId) => {
    await User.findByIdAndUpdate(userId, {
      resetToken: null,
      resetTokenExpiry: null,
    });
  },
  hashPassword,
  now: () => new Date(),
};

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createResetToken(
  email: string,
  deps: ForgotPasswordDependencies = forgotPasswordDependencies,
): Promise<
  | { ok: true; message: string; devToken?: string }
  | { ok: false; reason: "email" | "error"; message: string }
> {
  const user = await deps.findUserByEmail(email.trim().toLowerCase());
  if (!user) {
    return { ok: true, message: GENERIC_MESSAGE };
  }

  const token = generateResetToken();
  const expiry = new Date(deps.now().getTime() + TOKEN_LIFETIME_MS);
  const resetUrl = deps.getResetUrl(token);

  try {
    await deps.saveToken(user._id.toString(), token, expiry);
    await deps.sendEmail(user.email, resetUrl);
  } catch {
    // A failed delivery must not leave a usable token in the database.
    await deps.clearToken(user._id.toString()).catch(() => undefined);
    return {
      ok: false,
      reason: "error",
      message: "No se pudo enviar el correo. Intenta más tarde.",
    };
  }

  return {
    ok: true,
    message: GENERIC_MESSAGE,
    ...(deps.isDevelopment ? { devToken: token } : {}),
  };
}

export async function validateResetToken(
  token: string,
  deps: Pick<ResetPasswordDependencies, "findUserByToken" | "now"> =
    resetPasswordDependencies,
): Promise<boolean> {
  return (await deps.findUserByToken(token, deps.now())) !== null;
}

export async function resetPassword(
  token: string,
  password: string,
  deps: ResetPasswordDependencies = resetPasswordDependencies,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const user = await deps.findUserByToken(token, deps.now());
  if (!user) {
    return { ok: false, message: INVALID_TOKEN_MESSAGE };
  }

  const passwordHash = await deps.hashPassword(password);
  await deps.updatePassword(user._id.toString(), passwordHash);
  await deps.clearToken(user._id.toString());
  return { ok: true, message: RESET_SUCCESS_MESSAGE };
}
