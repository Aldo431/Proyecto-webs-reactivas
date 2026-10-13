import type { RequestHandler } from "express";
import {
  loginInputSchema,
  registerRequestSchema,
  type PublicUser,
} from "@tiendadcc/utils";
import { getEnv } from "../config/env.ts";
import {
  authenticateUser,
  createUser,
  signToken,
} from "../services/authService.ts";
import { clearSessionCookie, setSessionCookie } from "../services/session.ts";

export const register: RequestHandler = async (request, response) => {
  const input = registerRequestSchema.parse(request.body);
  const user = await createUser(input);

  setSessionCookie(response, signToken(user._id.toString(), getEnv().jwtSecret));
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

  setSessionCookie(response, signToken(user._id.toString(), getEnv().jwtSecret));
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
