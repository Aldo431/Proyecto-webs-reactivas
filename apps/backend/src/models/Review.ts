import { Schema, model, type Types } from "mongoose";
import {
  COMMENT_MAX_LENGTH,
  RATING_MAX,
  RATING_MIN,
  type Review as PublicReview,
} from "@tiendadcc/utils";

export interface ReviewFields {
  product: Types.ObjectId;
  author: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

// Los validadores repiten los límites de los esquemas Zod de `@tiendadcc/utils`
// como respaldo: la validación de entrada vive en Zod (spec 010, RF-5).
const reviewSchema = new Schema<ReviewFields>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "La calificación es obligatoria."],
      validate: {
        validator: (value: number) =>
          Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX,
        message: "La calificación debe ser un número entero entre 1 y 5.",
      },
    },
    comment: {
      type: String,
      required: [true, "El comentario es obligatorio."],
      trim: true,
      minlength: [1, "El comentario es obligatorio."],
      maxlength: [
        COMMENT_MAX_LENGTH,
        `El comentario no puede superar los ${COMMENT_MAX_LENGTH} caracteres.`,
      ],
    },
  },
  { timestamps: true },
);

// Una reseña por usuario y producto (RF-2): el índice único lo garantiza
// incluso ante dobles envíos simultáneos.
reviewSchema.index({ product: 1, author: 1 }, { unique: true });
// Listado del producto: más recientes primero, con desempate estable (RF-1).
reviewSchema.index({ product: 1, createdAt: -1, _id: -1 });

export const Review = model<ReviewFields>("Review", reviewSchema);

/** Autor tal como llega de `populate("author", "username displayName")`. */
export interface PopulatedAuthor {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
}

/** Reseña leída con `lean()` y el autor poblado. */
export interface ReviewWithAuthor extends Omit<ReviewFields, "author"> {
  _id: Types.ObjectId;
  author: PopulatedAuthor;
}

// Contrato público (RF-1): el autor solo expone id, username y displayName.
export function toPublicReview(review: ReviewWithAuthor): PublicReview {
  return {
    id: review._id.toString(),
    productId: review.product.toString(),
    author: {
      id: review.author._id.toString(),
      username: review.author.username,
      displayName: review.author.displayName,
    },
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
