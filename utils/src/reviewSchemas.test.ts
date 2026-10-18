import { describe, expect, it } from "vitest";
import {
  COMMENT_MAX_LENGTH,
  createReviewInputSchema,
  MAX_REVIEWS_LIMIT,
  RATING_MAX,
  RATING_MIN,
  reviewListSchema,
  reviewSchema,
  updateReviewInputSchema,
} from "./reviewSchemas.ts";

const RATING_MESSAGE = "La calificación debe ser un número entero entre 1 y 5.";

const validInput = { rating: 5, comment: "Excelente producto." };

const publicReview = {
  id: "6713b0c2a1f4e9d2c8b70a99",
  productId: "68f1c2a9b3d4e5f60718293a",
  author: {
    id: "68f1c2a9b3d4e5f60718293b",
    username: "anaperez",
    displayName: "Ana Pérez",
  },
  rating: 4,
  comment: "Muy buena calidad.",
  createdAt: "2026-10-14T12:00:00.000Z",
  updatedAt: "2026-10-14T12:00:00.000Z",
};

function firstMessage(
  result: { success: boolean; error?: { issues: { message: string }[] } },
): string | undefined {
  return result.error?.issues[0]?.message;
}

describe("constantes de reseñas", () => {
  it("fijan los límites del rating, el comentario y el tope de listado", () => {
    expect(RATING_MIN).toBe(1);
    expect(RATING_MAX).toBe(5);
    expect(COMMENT_MAX_LENGTH).toBe(500);
    expect(MAX_REVIEWS_LIMIT).toBe(20);
  });
});

describe("createReviewInputSchema", () => {
  it("acepta una reseña válida y recorta el comentario", () => {
    const result = createReviewInputSchema.safeParse({
      rating: 4,
      comment: "  Muy buena calidad.  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment).toBe("Muy buena calidad.");
    }
  });

  it("acepta los ratings de los bordes (1 y 5)", () => {
    for (const rating of [RATING_MIN, RATING_MAX]) {
      expect(
        createReviewInputSchema.safeParse({ ...validInput, rating }).success,
      ).toBe(true);
    }
  });

  it("acepta un comentario de 1 y de 500 caracteres", () => {
    for (const comment of ["a", "b".repeat(COMMENT_MAX_LENGTH)]) {
      expect(
        createReviewInputSchema.safeParse({ ...validInput, comment }).success,
      ).toBe(true);
    }
  });

  it.each([0, 6, 3.5, -1, "cinco", null, Number.NaN])(
    "rechaza el rating %s con mensaje en español",
    (rating) => {
      const result = createReviewInputSchema.safeParse({ ...validInput, rating });
      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe(RATING_MESSAGE);
    },
  );

  it("rechaza un comentario vacío o solo con espacios", () => {
    for (const comment of ["", "   "]) {
      const result = createReviewInputSchema.safeParse({ ...validInput, comment });
      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe("El comentario es obligatorio.");
    }
  });

  it("rechaza un comentario de más de 500 caracteres", () => {
    const result = createReviewInputSchema.safeParse({
      ...validInput,
      comment: "a".repeat(COMMENT_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(
      "El comentario no puede superar los 500 caracteres.",
    );
  });

  it("exige ambos campos", () => {
    expect(createReviewInputSchema.safeParse({ rating: 5 }).success).toBe(false);
    expect(createReviewInputSchema.safeParse({ comment: "hola" }).success).toBe(
      false,
    );
    expect(createReviewInputSchema.safeParse({}).success).toBe(false);
  });

  it("descarta campos desconocidos como productId y author", () => {
    const result = createReviewInputSchema.safeParse({
      ...validInput,
      productId: "x",
      author: "otro",
      id: "y",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data).sort()).toEqual(["comment", "rating"]);
    }
  });
});

describe("updateReviewInputSchema", () => {
  it("acepta cualquier subconjunto de campos válidos", () => {
    expect(updateReviewInputSchema.safeParse({ rating: 3 }).success).toBe(true);
    expect(
      updateReviewInputSchema.safeParse({ comment: "Corrijo mi opinión." })
        .success,
    ).toBe(true);
    expect(updateReviewInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza un cuerpo vacío o con solo campos desconocidos", () => {
    for (const body of [{}, { productId: "x" }, { author: "otro", id: "y" }]) {
      const result = updateReviewInputSchema.safeParse(body);
      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe("No hay cambios para guardar.");
    }
  });

  it("valida cada campo enviado con las mismas reglas", () => {
    expect(updateReviewInputSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(updateReviewInputSchema.safeParse({ comment: "" }).success).toBe(
      false,
    );
    expect(
      updateReviewInputSchema.safeParse({
        comment: "a".repeat(COMMENT_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});

describe("reviewSchema", () => {
  it("acepta el contrato público", () => {
    expect(reviewSchema.safeParse(publicReview).success).toBe(true);
  });

  it("rechaza reseñas sin autor, con rating inválido o fechas inválidas", () => {
    const { author: _author, ...withoutAuthor } = publicReview;
    expect(reviewSchema.safeParse(withoutAuthor).success).toBe(false);
    expect(reviewSchema.safeParse({ ...publicReview, rating: 6 }).success).toBe(
      false,
    );
    expect(
      reviewSchema.safeParse({ ...publicReview, createdAt: "ayer" }).success,
    ).toBe(false);
  });

  it("no expone campos privados del autor", () => {
    const result = reviewSchema.safeParse({
      ...publicReview,
      author: { ...publicReview.author, email: "ana@dcc.uchile.cl" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.author).not.toHaveProperty("email");
    }
  });
});

describe("reviewListSchema", () => {
  it("acepta un listado vacío con promedio null", () => {
    const result = reviewListSchema.safeParse({
      reviews: [],
      total: 0,
      promedioRating: null,
    });
    expect(result.success).toBe(true);
  });

  it("acepta un listado con reseñas y promedio", () => {
    const result = reviewListSchema.safeParse({
      reviews: [publicReview],
      total: 1,
      promedioRating: 4,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza total negativo, promedio fuera de 0-5 o promedio ausente", () => {
    const base = { reviews: [], total: 0, promedioRating: null };
    expect(
      reviewListSchema.safeParse({ ...base, total: -1 }).success,
    ).toBe(false);
    expect(
      reviewListSchema.safeParse({ ...base, promedioRating: 5.5 }).success,
    ).toBe(false);
    expect(
      reviewListSchema.safeParse({ reviews: [], total: 0 }).success,
    ).toBe(false);
  });
});
