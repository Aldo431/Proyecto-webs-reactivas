import type { RequestHandler } from "express";
import mongoose from "mongoose";
import {
  mfaDisableInputSchema,
  mfaEnableConfirmSchema,
  mfaResendInputSchema,
  mfaVerifyInputSchema,
} from "@tiendadcc/utils";
import { getEnv } from "../config/env.ts";
import { ConflictError, HttpError, UnauthorizedError } from "../errors.ts";
import { MfaChallenge } from "../models/MfaChallenge.ts";
import { User } from "../models/User.ts";
import { signToken, verifyPassword } from "../services/authService.ts";
import {
  createMfaChallenge,
  resendMfaChallenge,
  verifyMfaChallenge,
} from "../services/mfaService.ts";
import { setSessionCookie } from "../services/session.ts";

const INVALID_CHALLENGE_MESSAGE =
  "El código de verificación es inválido o ha expirado.";
const ALREADY_ENABLED_MESSAGE = "La verificación en dos pasos ya está activada.";
const NOT_ENABLED_MESSAGE = "La verificación en dos pasos no está activada.";
const ENABLED_MESSAGE = "Verificación en dos pasos activada correctamente.";
const DISABLED_MESSAGE = "Verificación en dos pasos desactivada correctamente.";

export const requestMfaEnable: RequestHandler = async (request, response) => {
  if (request.user?.mfaEnabled === true) {
    throw new ConflictError(ALREADY_ENABLED_MESSAGE);
  }
  const result = await createMfaChallenge(request.user?.id ?? "", "enable");
  response.status(202).json({
    challengeId: result.challengeId,
    message: result.message,
    ...(result.devCode && { devCode: result.devCode }),
  });
};

export const confirmMfaEnable: RequestHandler = async (request, response) => {
  if (request.user?.mfaEnabled === true) {
    throw new ConflictError(ALREADY_ENABLED_MESSAGE);
  }
  const input = mfaEnableConfirmSchema.parse(request.body);
  await verifyMfaChallenge(
    input.challengeId,
    request.user?.id ?? "",
    input.code,
    "enable",
  );
  await User.findByIdAndUpdate(request.user?.id ?? "", { mfaEnabled: true });
  response.status(200).json({ message: ENABLED_MESSAGE });
};

export const requestMfaDisable: RequestHandler = async (request, response) => {
  if (request.user?.mfaEnabled !== true) {
    throw new ConflictError(NOT_ENABLED_MESSAGE);
  }
  const result = await createMfaChallenge(request.user?.id ?? "", "disable");
  response.status(202).json({
    challengeId: result.challengeId,
    message: result.message,
    ...(result.devCode && { devCode: result.devCode }),
  });
};

export const disableMfa: RequestHandler = async (request, response) => {
  if (request.user?.mfaEnabled !== true) {
    throw new ConflictError(NOT_ENABLED_MESSAGE);
  }
  const input = mfaDisableInputSchema.parse(request.body);
  const user = await User.findById(request.user?.id ?? "");
  if (!user) {
    throw new UnauthorizedError();
  }
  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError("La contraseña actual es incorrecta.");
  }
  await verifyMfaChallenge(input.challengeId, user._id.toString(), input.code, "disable");
  user.mfaEnabled = false;
  await user.save();
  response.status(200).json({ message: DISABLED_MESSAGE });
};

export const verifyMfaLogin: RequestHandler = async (request, response) => {
  const input = mfaVerifyInputSchema.parse(request.body);
  if (!mongoose.isValidObjectId(input.challengeId)) {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }
  const challenge = await MfaChallenge.findById(input.challengeId).lean<{
    user: { toString(): string };
    purpose: string;
  } | null>();
  if (!challenge || challenge.purpose !== "login") {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }
  await verifyMfaChallenge(
    input.challengeId,
    challenge.user.toString(),
    input.code,
    "login",
  );
  const user = await User.findById(challenge.user.toString());
  if (!user) {
    throw new HttpError(400, INVALID_CHALLENGE_MESSAGE);
  }
  setSessionCookie(
    response,
    signToken(user._id.toString(), getEnv().jwtSecret, user.sessionVersion ?? 0),
  );
  response.status(200).json(user.toPublicJSON());
};

export const resendMfaCode: RequestHandler = async (request, response) => {
  const input = mfaResendInputSchema.parse(request.body);
  const result = await resendMfaChallenge(input.challengeId);
  response.status(202).json({
    message: result.message,
    ...(result.devCode && { devCode: result.devCode }),
  });
};
