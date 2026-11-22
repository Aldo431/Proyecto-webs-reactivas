import { randomInt } from "node:crypto";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  STUDENT_EMAIL_MESSAGE,
  isStudentEmail,
  normalizeEmail,
} from "@tiendadcc/utils";
import {
  hashMfaCode,
  safeEqualMfaCode,
} from "@tiendadcc/utils/mfaCode";
import { getEnv } from "../config/env.ts";
import { HttpError } from "../errors.ts";
import { User, type UserDocument } from "../models/User.ts";
import { emailService } from "./emailService.ts";

const INVALID_CODE_MESSAGE = "El código de verificación es inválido o ha expirado.";
const TOO_MANY_ATTEMPTS_MESSAGE =
  "Has excedido el número de intentos. Solicita un nuevo código.";
const SEND_FAILURE_MESSAGE = "No se pudo enviar el código. Intenta más tarde.";

export interface StudentVerificationDeps {
  findUser(userId: string): Promise<UserDocument | null>;
  saveUser(user: UserDocument): Promise<void>;
  sendEmail(to: string, code: string): Promise<void>;
  now(): Date;
  isProduction: boolean;
}

export const studentVerificationDeps: StudentVerificationDeps = {
  findUser: (userId) => User.findById(userId),
  saveUser: async (user) => {
    await user.save();
  },
  sendEmail: (to, code) => emailService.sendStudentCodeEmail(to, code),
  now: () => new Date(),
  isProduction: getEnv().nodeEnv === "production",
};

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestStudentCode(
  userId: string,
  email: string,
  deps: StudentVerificationDeps = studentVerificationDeps,
): Promise<{ message: string; devCode?: string }> {
  if (!isStudentEmail(email)) {
    throw new HttpError(400, STUDENT_EMAIL_MESSAGE);
  }
  const user = await deps.findUser(userId);
  if (!user) {
    throw new HttpError(401, "Debes iniciar sesión.");
  }

  const code = generateCode();
  const now = deps.now();
  user.studentCodeHash = hashMfaCode(code);
  user.studentCodeExpiry = new Date(now.getTime() + OTP_TTL_MS);
  user.studentCodeAttempts = 0;

  try {
    await deps.sendEmail(normalizeEmail(email), code);
  } catch {
    user.studentCodeHash = null;
    user.studentCodeExpiry = null;
    user.studentCodeAttempts = 0;
    await deps.saveUser(user).catch(() => undefined);
    throw new HttpError(500, SEND_FAILURE_MESSAGE);
  }

  await deps.saveUser(user);
  return {
    message: "Enviamos un código de verificación a tu correo U. de Chile.",
    ...(deps.isProduction ? {} : { devCode: code }),
  };
}

export async function confirmStudentCode(
  userId: string,
  code: string,
  deps: StudentVerificationDeps = studentVerificationDeps,
): Promise<{ message: string }> {
  const user = await deps.findUser(userId);
  if (!user) {
    throw new HttpError(401, "Debes iniciar sesión.");
  }

  const hash = user.studentCodeHash;
  const expiry = user.studentCodeExpiry;
  if (
    hash === null ||
    hash === undefined ||
    expiry === null ||
    expiry === undefined ||
    expiry.getTime() <= deps.now().getTime() ||
    (user.studentCodeAttempts ?? 0) >= OTP_MAX_ATTEMPTS
  ) {
    throw new HttpError(400, INVALID_CODE_MESSAGE);
  }

  if (!safeEqualMfaCode(hash, hashMfaCode(code))) {
    const attempts = (user.studentCodeAttempts ?? 0) + 1;
    user.studentCodeAttempts = attempts;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      user.studentCodeHash = null;
      user.studentCodeExpiry = null;
      user.studentCodeAttempts = OTP_MAX_ATTEMPTS;
    }
    await deps.saveUser(user);
    throw new HttpError(
      attempts >= OTP_MAX_ATTEMPTS ? 429 : 400,
      attempts >= OTP_MAX_ATTEMPTS ? TOO_MANY_ATTEMPTS_MESSAGE : INVALID_CODE_MESSAGE,
    );
  }

  user.studentVerified = true;
  user.studentCodeHash = null;
  user.studentCodeExpiry = null;
  user.studentCodeAttempts = 0;
  await deps.saveUser(user);
  return { message: "Correo U. de Chile verificado. Ya tienes el descuento de alumno." };
}
