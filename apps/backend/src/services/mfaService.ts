import mongoose from "mongoose";
import {
  MFA_LOGIN_TTL_MS,
  MFA_MAX_ATTEMPTS,
  MFA_MAX_RESENDS,
  MFA_SETUP_TTL_MS,
  type MfaPurpose,
} from "@tiendadcc/utils";
import {
  generateMfaCode,
  hashMfaCode,
  safeEqualMfaCode,
} from "@tiendadcc/utils/mfaCode";
import { getEnv } from "../config/env.ts";
import { HttpError } from "../errors.ts";
import {
  MfaChallenge,
  type MfaChallengeFields,
} from "../models/MfaChallenge.ts";
import { User } from "../models/User.ts";
import { emailService } from "./emailService.ts";

const INVALID_CHALLENGE_MESSAGE =
  "El código de verificación es inválido o ha expirado.";
const TOO_MANY_ATTEMPTS_MESSAGE =
  "Has excedido el número de intentos. Solicita un nuevo código.";
const TOO_MANY_RESENDS_MESSAGE =
  "Has excedido el número de reenvíos. Intenta más tarde.";
const SEND_FAILURE_MESSAGE = "No se pudo enviar el código. Intenta más tarde.";

export interface MfaChallengeLike extends MfaChallengeFields {
  _id: { toString(): string };
}

export interface MfaServiceDeps {
  findUser(userId: string): Promise<{ email: string } | null>;
  createChallenge(data: {
    user: string;
    purpose: MfaPurpose;
    codeHash: string;
    expiresAt: Date;
    resendCount: number;
  }): Promise<MfaChallengeLike>;
  findChallenge(
    challengeId: string,
    userId: string,
    purpose: MfaPurpose,
  ): Promise<MfaChallengeLike | null>;
  updateChallenge(
    challengeId: string,
    update: Partial<MfaChallengeFields>,
  ): Promise<void>;
  deleteChallenge(challengeId: string): Promise<void>;
  sendEmail(to: string, code: string): Promise<void>;
  now(): Date;
  isProduction: boolean;
}

function ttlFor(purpose: MfaPurpose): number {
  return purpose === "login" ? MFA_LOGIN_TTL_MS : MFA_SETUP_TTL_MS;
}

export const mfaServiceDeps: MfaServiceDeps = {
  findUser: (userId) => User.findById(userId).lean<{ email: string } | null>(),
  createChallenge: async (data) => {
    const challenge = await MfaChallenge.create(data);
    return challenge as unknown as MfaChallengeLike;
  },
  findChallenge: (challengeId, userId, purpose) => {
    if (!mongoose.isValidObjectId(challengeId)) {
      return Promise.resolve(null);
    }
    return MfaChallenge.findOne({
      _id: challengeId,
      user: userId,
      purpose,
    }).lean<MfaChallengeLike | null>();
  },
  updateChallenge: async (challengeId, update) => {
    await MfaChallenge.updateOne({ _id: challengeId }, { $set: update });
  },
  deleteChallenge: async (challengeId) => {
    await MfaChallenge.deleteOne({ _id: challengeId });
  },
  sendEmail: (to, code) => emailService.sendMfaCodeEmail(to, code),
  now: () => new Date(),
  isProduction: getEnv().nodeEnv === "production",
};

function devCode(code: string, isProduction: boolean): { devCode?: string } {
  return isProduction ? {} : { devCode: code };
}

export async function createMfaChallenge(
  userId: string,
  purpose: MfaPurpose,
  deps: MfaServiceDeps = mfaServiceDeps,
): Promise<{ challengeId: string; message: string; devCode?: string }> {
  const user = await deps.findUser(userId);
  if (!user) {
    throw new HttpError(401, "Debes iniciar sesión.");
  }
  const code = generateMfaCode();
  const challenge = await deps.createChallenge({
    user: userId,
    purpose,
    codeHash: hashMfaCode(code),
    expiresAt: new Date(deps.now().getTime() + ttlFor(purpose)),
    resendCount: 0,
  });

  try {
    await deps.sendEmail(user.email, code);
  } catch {
    await deps.deleteChallenge(challenge._id.toString()).catch(() => undefined);
    throw new HttpError(500, SEND_FAILURE_MESSAGE);
  }

  return {
    challengeId: challenge._id.toString(),
    message: "Enviamos un código de verificación a tu correo.",
    ...devCode(code, deps.isProduction),
  };
}

export async function verifyMfaChallenge(
  challengeId: string,
  userId: string,
  code: string,
  purpose: MfaPurpose,
  deps: MfaServiceDeps = mfaServiceDeps,
): Promise<MfaChallengeLike> {
  const challenge = await deps.findChallenge(challengeId, userId, purpose);
  if (!challenge || challenge.usedAt !== null) {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }
  if (challenge.expiresAt.getTime() <= deps.now().getTime()) {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }
  if ((challenge.attempts ?? 0) >= MFA_MAX_ATTEMPTS) {
    throw new HttpError(429, TOO_MANY_ATTEMPTS_MESSAGE);
  }

  if (!safeEqualMfaCode(challenge.codeHash, hashMfaCode(code))) {
    const attempts = (challenge.attempts ?? 0) + 1;
    await deps.updateChallenge(challengeId, {
      attempts,
      ...(attempts >= MFA_MAX_ATTEMPTS ? { usedAt: deps.now() } : {}),
    });
    throw new HttpError(
      attempts >= MFA_MAX_ATTEMPTS ? 429 : 400,
      attempts >= MFA_MAX_ATTEMPTS ? TOO_MANY_ATTEMPTS_MESSAGE : INVALID_CHALLENGE_MESSAGE,
    );
  }

  await deps.updateChallenge(challengeId, { attempts: challenge.attempts ?? 0, usedAt: deps.now() });
  return challenge;
}

export async function resendMfaChallenge(
  challengeId: string,
  deps: MfaServiceDeps = mfaServiceDeps,
): Promise<{ message: string; devCode?: string }> {
  if (!mongoose.isValidObjectId(challengeId)) {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }
  const challenge = await MfaChallenge.findOne({ _id: challengeId }).lean<MfaChallengeLike | null>();
  if (!challenge || challenge.usedAt !== null) {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }
  if (challenge.expiresAt.getTime() <= deps.now().getTime()) {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }
  if ((challenge.resendCount ?? 0) >= MFA_MAX_RESENDS) {
    throw new HttpError(429, TOO_MANY_RESENDS_MESSAGE);
  }
  const user = await deps.findUser(challenge.user.toString());
  if (!user) {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }

  const code = generateMfaCode();
  await deps.updateChallenge(challengeId, {
    codeHash: hashMfaCode(code),
    expiresAt: new Date(deps.now().getTime() + ttlFor(challenge.purpose)),
    attempts: 0,
    resendCount: (challenge.resendCount ?? 0) + 1,
  });
  try {
    await deps.sendEmail(user.email, code);
  } catch {
    throw new HttpError(500, SEND_FAILURE_MESSAGE);
  }
  return {
    message: "Enviamos un nuevo código de verificación a tu correo.",
    ...devCode(code, deps.isProduction),
  };
}
