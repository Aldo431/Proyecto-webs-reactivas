import type { RequestHandler } from "express";
import { getEnv } from "../config/env.ts";
import { ForbiddenError, UnauthorizedError } from "../errors.ts";
import { findUserById, verifySessionToken } from "../services/authService.ts";
import { SESSION_COOKIE } from "../services/session.ts";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const token: unknown = request.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    throw new UnauthorizedError();
  }

  const session = verifySessionToken(token, getEnv().jwtSecret);
  if (!session) {
    throw new UnauthorizedError();
  }

  const user = await findUserById(session.userId);
  if (!user || (user.sessionVersion ?? 0) !== session.sessionVersion) {
    throw new UnauthorizedError();
  }

  request.user = user.toPublicJSON();
  next();
};

// Debe montarse después de `requireAuth`: el rol se lee de MongoDB en cada
// solicitud (no del JWT), así que un cambio de rol aplica de inmediato.
export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (request.user?.role !== "admin") {
    throw new ForbiddenError("Solo un administrador puede realizar esta acción.");
  }
  next();
};
