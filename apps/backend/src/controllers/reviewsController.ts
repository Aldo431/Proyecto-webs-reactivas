import type { Request, RequestHandler } from "express";
import {
  createReviewInputSchema,
  updateReviewInputSchema,
} from "@tiendadcc/utils";
import { UnauthorizedError } from "../errors.ts";
import {
  assertProductExists,
  assertReviewAuthor,
  createReview,
  deleteReview,
  listProductReviews,
  updateReview,
} from "../services/reviewService.ts";

function requireUserId(request: Request): string {
  const id = request.user?.id;
  if (!id) {
    throw new UnauthorizedError();
  }
  return id;
}

function productIdParam(request: Request): string {
  const { id } = request.params;
  return typeof id === "string" ? id : "";
}

function reviewIdParam(request: Request): string {
  const { id } = request.params;
  return typeof id === "string" ? id : "";
}

export const listProductReviewsHandler: RequestHandler = async (
  request,
  response,
) => {
  response
    .status(200)
    .json(await listProductReviews(productIdParam(request)));
};

export const createReviewHandler: RequestHandler = async (
  request,
  response,
) => {
  const userId = requireUserId(request);
  const productId = productIdParam(request);
  // Orden 401 → 404 → 400 (D5): el producto se verifica antes de validar el
  // cuerpo.
  await assertProductExists(productId);
  const input = createReviewInputSchema.parse(request.body);
  response.status(201).json(await createReview(userId, productId, input));
};

export const updateReviewHandler: RequestHandler = async (
  request,
  response,
) => {
  const userId = requireUserId(request);
  const id = reviewIdParam(request);
  // Orden 401 → 404 → 403 → 400 (D5): existencia y propiedad antes de validar.
  await assertReviewAuthor(userId, id);
  const input = updateReviewInputSchema.parse(request.body);
  response.status(200).json(await updateReview(userId, id, input));
};

export const deleteReviewHandler: RequestHandler = async (
  request,
  response,
) => {
  await deleteReview(requireUserId(request), reviewIdParam(request));
  response.status(204).end();
};
