import type { Request, RequestHandler } from "express";
import {
  cartSchema,
  favoriteInputSchema,
  historyInputSchema,
  updateProfileSchema,
} from "@tiendadcc/utils";
import { UnauthorizedError } from "../errors.ts";
import { findUserById } from "../services/authService.ts";
import {
  addFavorite,
  recordVisit,
  removeFavorite,
  replaceCart,
  updateProfileData,
} from "../services/profileService.ts";

function requireUserId(request: Request): string {
  const id = request.user?.id;
  if (!id) {
    throw new UnauthorizedError();
  }
  return id;
}

export const getProfile: RequestHandler = async (request, response) => {
  const user = await findUserById(requireUserId(request));
  if (!user) {
    throw new UnauthorizedError();
  }
  response.status(200).json(user.toProfileJSON());
};

export const updateProfile: RequestHandler = async (request, response) => {
  const input = updateProfileSchema.parse(request.body);
  // Solo nombre y correo llegan al servicio: favorites, history, cart,
  // emailVerified e isAdmin no existen en el esquema y quedan fuera (RF-3).
  const updated = await updateProfileData(requireUserId(request), input);
  if (!updated) {
    throw new UnauthorizedError();
  }
  response.status(200).json(updated.toProfileJSON());
};

export const addFavoriteHandler: RequestHandler = async (
  request,
  response,
) => {
  const input = favoriteInputSchema.parse(request.body);
  const updated = await addFavorite(requireUserId(request), input.productId);
  if (!updated) {
    throw new UnauthorizedError();
  }
  response.status(200).json(updated.favorites);
};

export const removeFavoriteHandler: RequestHandler = async (
  request,
  response,
) => {
  const input = favoriteInputSchema.parse({
    productId: request.params.productId,
  });
  const updated = await removeFavorite(requireUserId(request), input.productId);
  if (!updated) {
    throw new UnauthorizedError();
  }
  response.status(200).json(updated.favorites);
};

export const recordVisitHandler: RequestHandler = async (
  request,
  response,
) => {
  const input = historyInputSchema.parse(request.body);
  const updated = await recordVisit(requireUserId(request), input.productId);
  if (!updated) {
    throw new UnauthorizedError();
  }
  response.status(200).json(updated.toProfileJSON().history);
};

export const replaceCartHandler: RequestHandler = async (
  request,
  response,
) => {
  const lines = cartSchema.parse(request.body);
  const updated = await replaceCart(requireUserId(request), lines);
  if (!updated) {
    throw new UnauthorizedError();
  }
  response.status(200).json(updated.toProfileJSON().cart);
};
