import type { RequestHandler } from "express";
import {
  forgotPasswordInputSchema,
  loginInputSchema,
  registerRequestSchema,
  resetPasswordInputSchema,
  type PublicUser,
} from "@tiendadcc/utils";
import { getEnv } from "../config/env.ts";
import {
  authenticateUser,
  createUser,
  signToken,
} from "../services/authService.ts";
import { clearSessionCookie, setSessionCookie } from "../services/session.ts";
import {
  createResetToken,
  resetPassword as resetPasswordService,
  validateResetToken as validateResetTokenService,
} from "../services/passwordResetService.ts";

export const register: RequestHandler = async (request, response) => {
  const input = registerRequestSchema.parse(request.body);
  const user = await createUser(input);

  setSessionCookie(
    response,
    signToken(user._id.toString(), getEnv().jwtSecret, user.sessionVersion ?? 0),
  );
  response.status(201).json(user.toPublicJSON());
};

export const login: RequestHandler = async (request, response) => {
  const input = loginInputSchema.parse(request.body);
  const user = await authenticateUser(input.email, input.password);

  if (!user) {
    response
      .status(401)
      .json({ message: "Correo o contraseña incorrectos." });
    return;
  }

  setSessionCookie(
    response,
    signToken(user._id.toString(), getEnv().jwtSecret, user.sessionVersion ?? 0),
  );
  response.status(200).json(user.toPublicJSON());
};

export const logout: RequestHandler = (_request, response) => {
  clearSessionCookie(response);
  response.status(204).end();
};

export const me: RequestHandler = (request, response) => {
  const user: PublicUser | undefined = request.user;
  response.status(200).json(user);
};

export const forgotPassword: RequestHandler = async (request, response) => {
  const input = forgotPasswordInputSchema.parse(request.body);
  const result = await createResetToken(input.email);

  if (result.ok) {
    response.status(200).json({
      message: result.message,
      ...(result.devToken && { devToken: result.devToken }),
    });
  } else {
    response.status(500).json({ message: result.message });
  }
};

export const validateResetToken: RequestHandler<{ token: string }> = async (request, response) => {
  const { token } = request.params;

  // Validate token format (64 hex characters)
  if (!/^[a-f0-9]{64}$/.test(token)) {
    response.status(200).json({ valid: false });
    return;
  }

  const isValid = await validateResetTokenService(token);
  response.status(200).json({ valid: isValid });
};

export const resetPassword: RequestHandler = async (request, response) => {
  const input = resetPasswordInputSchema.parse(request.body);
  const result = await resetPasswordService(input.token, input.password);

  if (result.ok) {
    clearSessionCookie(response);
    response.status(200).json({ message: result.message });
  } else {
    response.status(400).json({ message: result.message });
  }
};
