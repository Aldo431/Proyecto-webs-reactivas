import type { Review } from "@tiendadcc/utils";

// Pure helpers for the reviews section (spec 010, RF-6). No React, no network.

// Reseña del usuario en sesión, si ya publicó una para el producto.
export function findOwnReview(
  reviews: readonly Review[],
  userId: string,
): Review | undefined {
  return reviews.find((review) => review.author.id === userId);
}

// Promedio como texto en español ("4,25"), o null sin reseñas. El promedio ya
// viene redondeado a dos decimales desde el servidor; aquí solo se formatea.
export function formatAverageRating(average: number | null): string | null {
  if (average === null) {
    return null;
  }
  const rounded = Math.round(average * 100) / 100;
  return rounded.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
}

// Estrellas llenas para el resumen (redondeo al entero más cercano).
export function averageStars(average: number | null): number {
  if (average === null) {
    return 0;
  }
  return Math.round(average);
}
