import { Review } from "../models/Review.ts";

interface ReviewSeed {
  rating?: number;
  comment?: string;
  createdAt?: Date;
}

let counter = 0;

export async function seedReview(
  productId: string,
  authorId: string,
  seed: ReviewSeed = {},
) {
  counter += 1;
  return Review.create({
    product: productId,
    author: authorId,
    rating: seed.rating ?? 5,
    comment: seed.comment ?? `Reseña de prueba ${counter}.`,
    ...(seed.createdAt ? { createdAt: seed.createdAt } : {}),
  });
}
