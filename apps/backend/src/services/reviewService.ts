import { Types } from "mongoose";
import {
  MAX_REVIEWS_LIMIT,
  type CreateReviewInput,
  type Review as PublicReview,
  type ReviewList,
  type UpdateReviewInput,
} from "@tiendadcc/utils";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.ts";
import { Product } from "../models/Product.ts";
import {
  Review,
  toPublicReview,
  type ReviewWithAuthor,
} from "../models/Review.ts";
import { isObjectIdString } from "./productService.ts";

const PRODUCT_NOT_FOUND = "Producto no encontrado.";
const REVIEW_NOT_FOUND = "Reseña no encontrada.";
const NOT_AUTHOR_MESSAGE =
  "No puedes modificar una reseña de otro usuario.";
const DUPLICATE_MESSAGE = "Ya has reseñado este producto.";

const AUTHOR_FIELDS = "username displayName";
const NEWEST_FIRST = { createdAt: -1, _id: -1 } as const;

// Un id inválido o inexistente es "no encontrado" (404), igual que en 008.
export async function assertProductExists(productId: string): Promise<void> {
  if (
    !isObjectIdString(productId) ||
    (await Product.exists({ _id: productId })) === null
  ) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
}

// 404 antes que 403 (RF-3, RF-4): quien no es autor recibe 403 y no detalles
// de la reseña.
export async function assertReviewAuthor(
  userId: string,
  reviewId: string,
): Promise<void> {
  if (!isObjectIdString(reviewId)) {
    throw new NotFoundError(REVIEW_NOT_FOUND);
  }
  const review = await Review.findById(reviewId, { author: 1 }).lean();
  if (!review) {
    throw new NotFoundError(REVIEW_NOT_FOUND);
  }
  if (review.author.toString() !== userId) {
    throw new ForbiddenError(NOT_AUTHOR_MESSAGE);
  }
}

async function findPublicReviewById(id: string): Promise<PublicReview> {
  const review = await Review.findById(id)
    .populate("author", AUTHOR_FIELDS)
    .lean<ReviewWithAuthor | null>();
  if (!review) {
    throw new NotFoundError(REVIEW_NOT_FOUND);
  }
  return toPublicReview(review);
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

// Listado público con resumen (RF-1): cuenta y promedio sobre todas las
// reseñas, y las 20 más recientes con el autor poblado.
export async function listProductReviews(
  productId: string,
): Promise<ReviewList> {
  await assertProductExists(productId);

  const [summary] = await Review.aggregate<{ total: number; promedio: number }>([
    { $match: { product: new Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        promedio: { $avg: "$rating" },
      },
    },
  ]);
  const total = summary?.total ?? 0;

  const reviews = await Review.find({ product: productId })
    .sort(NEWEST_FIRST)
    .limit(MAX_REVIEWS_LIMIT)
    .populate("author", AUTHOR_FIELDS)
    .lean<ReviewWithAuthor[]>();

  return {
    reviews: reviews.map(toPublicReview),
    total,
    promedioRating:
      total === 0 ? null : Math.round((summary?.promedio ?? 0) * 100) / 100,
  };
}

// Crea la reseña del usuario (RF-2). El índice único `{ product, author }`
// traduce el doble envío a 409 sin crear una segunda reseña.
export async function createReview(
  userId: string,
  productId: string,
  input: CreateReviewInput,
): Promise<PublicReview> {
  await assertProductExists(productId);
  try {
    const created = await Review.create({
      product: productId,
      author: userId,
      rating: input.rating,
      comment: input.comment,
    });
    return findPublicReviewById(created._id.toString());
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ConflictError(DUPLICATE_MESSAGE);
    }
    throw error;
  }
}

// Actualiza solo los campos enviados (RF-3); quien llama ya verificó la
// autoría con `assertReviewAuthor`.
export async function updateReview(
  userId: string,
  reviewId: string,
  input: UpdateReviewInput,
): Promise<PublicReview> {
  await assertReviewAuthor(userId, reviewId);
  const changes = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
  const updated = await Review.findByIdAndUpdate(
    reviewId,
    { $set: changes },
    { new: true, runValidators: true, projection: { _id: 1 } },
  ).lean();
  if (!updated) {
    throw new NotFoundError(REVIEW_NOT_FOUND);
  }
  return findPublicReviewById(reviewId);
}

// Borra la reseña propia (RF-4).
export async function deleteReview(
  userId: string,
  reviewId: string,
): Promise<void> {
  await assertReviewAuthor(userId, reviewId);
  const result = await Review.deleteOne({ _id: reviewId });
  if (result.deletedCount === 0) {
    throw new NotFoundError(REVIEW_NOT_FOUND);
  }
}
