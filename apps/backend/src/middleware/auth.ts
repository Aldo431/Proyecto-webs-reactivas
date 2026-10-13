import type { RequestHandler } from "express";
import { getEnv } from "../config/env.ts";
import { UnauthorizedError } from "../errors.ts";
import { findUserById, verifyToken } from "../services/authService.ts";
import { SESSION_COOKIE } from "../services/session.ts";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const token: unknown = request.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    throw new UnauthorizedError();
  }

  const userId = verifyToken(token, getEnv().jwtSecret);
  if (!userId) {
    throw new UnauthorizedError();
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError();
  }

  request.user = user.toPublicJSON();
  next();
};
