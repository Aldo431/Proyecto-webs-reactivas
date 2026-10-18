import { z } from "zod";

// Límites de una reseña (spec 010, RF-5): rating entero de 1 a 5 estrellas,
// comentario de 1 a 500 caracteres y tope de reseñas listadas por producto.
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const COMMENT_MAX_LENGTH = 500;
export const MAX_REVIEWS_LIMIT = 20;

const RATING_MESSAGE = "La calificación debe ser un número entero entre 1 y 5.";
const COMMENT_REQUIRED_MESSAGE = "El comentario es obligatorio.";

export const ratingField = z
  .number({ error: RATING_MESSAGE })
  .int(RATING_MESSAGE)
  .min(RATING_MIN, RATING_MESSAGE)
  .max(RATING_MAX, RATING_MESSAGE);

export const commentField = z
  .string({ error: COMMENT_REQUIRED_MESSAGE })
  .trim()
  .min(1, COMMENT_REQUIRED_MESSAGE)
  .max(
    COMMENT_MAX_LENGTH,
    `El comentario no puede superar los ${COMMENT_MAX_LENGTH} caracteres.`,
  );

// Autor público de una reseña (RF-1, RNF-7): mismo shape que el vendedor de
// 008; nunca expone el correo ni el hash.
export const reviewAuthorSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
});

// Contrato público de una reseña.
export const reviewSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  author: reviewAuthorSchema,
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
  comment: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Entrada de creación: `productId` y `author` salen de la ruta y la sesión, no
// del cuerpo (z.object descarta claves desconocidas).
export const createReviewInputSchema = z.object({
  rating: ratingField,
  comment: commentField,
});

export const updateReviewInputSchema = createReviewInputSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: "No hay cambios para guardar." },
  );

// Respuesta del listado público (RF-1): `promedioRating` es null sin reseñas.
export const reviewListSchema = z.object({
  reviews: z.array(reviewSchema),
  total: z.number().int().min(0),
  promedioRating: z.number().min(0).max(RATING_MAX).nullable(),
});

export type ReviewAuthor = z.infer<typeof reviewAuthorSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;
export type ReviewList = z.infer<typeof reviewListSchema>;
