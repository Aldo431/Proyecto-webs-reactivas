import type { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "../errors.ts";
import { Product } from "../models/Product.ts";
import { Review } from "../models/Review.ts";
import { User } from "../models/User.ts";
import {
  createReview,
  deleteReview,
  listProductReviews,
  updateReview,
} from "../services/reviewService.ts";
import { createProduct } from "../test/productFixtures.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import { seedReview as createReviewRow } from "../test/reviewFixtures.ts";

let server: MongoMemoryServer;
let authorId: string;
let productId: string;

async function makeUser(username: string): Promise<string> {
  const user = await User.create({
    username,
    displayName: username,
    email: `${username}@dcc.uchile.cl`,
    passwordHash: "hash",
  });
  return user._id.toString();
}

beforeAll(async () => {
  server = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase(server);
});

beforeEach(async () => {
  await Review.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
  authorId = await makeUser("anaperez");
  const product = await createProduct(authorId);
  productId = product._id.toString();
});

describe("listProductReviews", () => {
  it("responde vacío con promedio null cuando no hay reseñas", async () => {
    expect(await listProductReviews(productId)).toEqual({
      reviews: [],
      total: 0,
      promedioRating: null,
    });
  });

  it("lanza NotFoundError con producto inexistente o id inválido", async () => {
    await expect(
      listProductReviews("6713b0c2a1f4e9d2c8b70a11"),
    ).rejects.toThrow("Producto no encontrado.");
    await expect(listProductReviews("no-es-id")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("calcula total y promedio redondeado a dos decimales", async () => {
    await createReview(authorId, productId, { rating: 5, comment: "a" });
    await createReview(await makeUser("bob"), productId, {
      rating: 4,
      comment: "b",
    });
    await createReview(await makeUser("carol"), productId, {
      rating: 4,
      comment: "c",
    });

    const result = await listProductReviews(productId);
    expect(result.total).toBe(3);
    expect(result.promedioRating).toBe(4.33);
  });

  it("ordena de más reciente a más antigua", async () => {
    const secondUser = await makeUser("bob");
    const older = await createReviewRow(productId, authorId, {
      createdAt: new Date("2026-01-01"),
    });
    const newer = await createReviewRow(productId, secondUser, {
      createdAt: new Date("2026-02-01"),
    });

    const result = await listProductReviews(productId);
    expect(result.reviews.map((review) => review.id)).toEqual([
      newer._id.toString(),
      older._id.toString(),
    ]);
  });

  it("limita a 20 las reseñas listadas y refleja el total real", async () => {
    for (let index = 0; index < 25; index += 1) {
      await createReview(await makeUser(`user${index}`), productId, {
        rating: 5,
        comment: `reseña ${index}`,
      });
    }

    const result = await listProductReviews(productId);
    expect(result.reviews).toHaveLength(20);
    expect(result.total).toBe(25);
  });

  it("expone al autor solo con id, username y displayName", async () => {
    await createReview(authorId, productId, { rating: 5, comment: "a" });
    const [review] = (await listProductReviews(productId)).reviews;
    expect(Object.keys(review!.author).sort()).toEqual([
      "displayName",
      "id",
      "username",
    ]);
  });
});

describe("createReview", () => {
  it("crea la reseña y la devuelve pública", async () => {
    const review = await createReview(authorId, productId, {
      rating: 4,
      comment: "Muy buena.",
    });
    expect(review).toMatchObject({
      productId,
      rating: 4,
      comment: "Muy buena.",
    });
    expect(review.author.id).toBe(authorId);
  });

  it("rechaza una segunda reseña del mismo usuario con 409", async () => {
    await createReview(authorId, productId, { rating: 5, comment: "a" });
    await expect(
      createReview(authorId, productId, { rating: 3, comment: "b" }),
    ).rejects.toThrow("Ya has reseñado este producto.");
  });

  it("rechaza producto inexistente", async () => {
    await expect(
      createReview(authorId, "6713b0c2a1f4e9d2c8b70a11", {
        rating: 5,
        comment: "a",
      }),
    ).rejects.toThrow("Producto no encontrado.");
  });
});

describe("updateReview", () => {
  it("actualiza la reseña propia", async () => {
    const created = await createReview(authorId, productId, {
      rating: 5,
      comment: "a",
    });
    const updated = await updateReview(authorId, created.id, {
      rating: 2,
      comment: "Cambié de opinión.",
    });

    expect(updated.rating).toBe(2);
    expect(updated.comment).toBe("Cambié de opinión.");
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime(),
    );
  });

  it("impide editar la reseña de otro usuario con 403", async () => {
    const created = await createReview(authorId, productId, {
      rating: 5,
      comment: "a",
    });
    const other = await makeUser("bob");
    await expect(updateReview(other, created.id, { rating: 1 })).rejects.toThrow(
      "No puedes modificar una reseña de otro usuario.",
    );
  });

  it("lanza 404 si la reseña no existe o el id es inválido", async () => {
    await expect(
      updateReview(authorId, "6713b0c2a1f4e9d2c8b70a11", { rating: 1 }),
    ).rejects.toThrow("Reseña no encontrada.");
    await expect(
      updateReview(authorId, "no-es-id", { rating: 1 }),
    ).rejects.toThrow("Reseña no encontrada.");
  });
});

describe("deleteReview", () => {
  it("borra la reseña propia y permite volver a reseñar", async () => {
    const created = await createReview(authorId, productId, {
      rating: 5,
      comment: "a",
    });
    await deleteReview(authorId, created.id);
    expect((await listProductReviews(productId)).total).toBe(0);

    await expect(
      createReview(authorId, productId, { rating: 3, comment: "b" }),
    ).resolves.toMatchObject({ rating: 3 });
  });

  it("impide borrar la reseña de otro usuario con 403", async () => {
    const created = await createReview(authorId, productId, {
      rating: 5,
      comment: "a",
    });
    const other = await makeUser("bob");
    await expect(deleteReview(other, created.id)).rejects.toThrow(
      "No puedes modificar una reseña de otro usuario.",
    );
  });

  it("lanza 404 si la reseña no existe", async () => {
    await expect(
      deleteReview(authorId, "6713b0c2a1f4e9d2c8b70a11"),
    ).rejects.toThrow("Reseña no encontrada.");
  });
});
