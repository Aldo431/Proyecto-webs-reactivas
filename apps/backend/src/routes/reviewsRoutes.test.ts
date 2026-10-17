import type { Express } from "express";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { Product } from "../models/Product.ts";
import { Review } from "../models/Review.ts";
import { User } from "../models/User.ts";
import {
  createProduct,
  createSeller,
  type TestSeller,
} from "../test/productFixtures.ts";
import { seedReview } from "../test/reviewFixtures.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";

let mongo: MongoMemoryServer;
let app: Express;
let ana: TestSeller;
let beto: TestSeller;
let productId: string;

const MISSING_ID = "6713b0c2a1f4e9d2c8b70a99";
const VALID_BODY = { rating: 5, comment: "Excelente producto." };

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
  await Product.syncIndexes();
  await Review.syncIndexes();
  app = createApp();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await Review.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
  ana = await createSeller(app, "anaperez", "Ana Pérez");
  beto = await createSeller(app, "betoruiz", "Beto Ruiz");
  const product = await createProduct(ana.id);
  productId = product._id.toString();
});

function productUrl(): string {
  return `/api/products/${productId}/reviews`;
}

describe("GET /api/products/:id/reviews", () => {
  it("responde 200 con un resumen vacío si no hay reseñas", async () => {
    const response = await request(app).get(productUrl());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      reviews: [],
      total: 0,
      promedioRating: null,
    });
  });

  it("lista de más reciente a más antigua con promedio y sin correo del autor", async () => {
    await seedReview(productId, ana.id, {
      rating: 4,
      comment: "Buena.",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    await seedReview(productId, beto.id, {
      rating: 2,
      comment: "Mala.",
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });

    const response = await request(app).get(productUrl());

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.promedioRating).toBe(3);
    expect(
      (response.body.reviews as { comment: string }[]).map((r) => r.comment),
    ).toEqual(["Mala.", "Buena."]);
    expect(response.body.reviews[0].author).toEqual({
      id: beto.id,
      username: "betoruiz",
      displayName: "Beto Ruiz",
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("@dcc.uchile.cl");
    expect(serialized).not.toContain("passwordHash");
  });

  it("responde 404 en español para un producto inexistente", async () => {
    const response = await request(app).get(
      `/api/products/${MISSING_ID}/reviews`,
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Producto no encontrado.");
  });
});

describe("POST /api/products/:id/reviews", () => {
  it("crea la reseña con 201 cuando hay sesión y aparece en el listado", async () => {
    const response = await request(app)
      .post(productUrl())
      .set("Cookie", ana.cookie)
      .send(VALID_BODY);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      productId,
      rating: 5,
      comment: "Excelente producto.",
      author: { id: ana.id, username: "anaperez", displayName: "Ana Pérez" },
    });
    expect(response.body.id).toEqual(expect.any(String));

    const list = await request(app).get(productUrl());
    expect(list.body.total).toBe(1);
  });

  it("responde 401 sin sesión", async () => {
    const response = await request(app).post(productUrl()).send(VALID_BODY);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Debes iniciar sesión.");
  });

  it("responde 409 en la segunda reseña del mismo usuario", async () => {
    await request(app)
      .post(productUrl())
      .set("Cookie", ana.cookie)
      .send(VALID_BODY);
    const response = await request(app)
      .post(productUrl())
      .set("Cookie", ana.cookie)
      .send(VALID_BODY);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Ya has reseñado este producto.");
  });

  it("responde 404 si el producto no existe", async () => {
    const response = await request(app)
      .post(`/api/products/${MISSING_ID}/reviews`)
      .set("Cookie", ana.cookie)
      .send(VALID_BODY);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Producto no encontrado.");
  });

  it("responde 400 con errores por campo ante rating o comentario inválidos", async () => {
    const badRating = await request(app)
      .post(productUrl())
      .set("Cookie", ana.cookie)
      .send({ rating: 0, comment: "Válido." });
    expect(badRating.status).toBe(400);
    expect(badRating.body.fieldErrors.rating).toBeTruthy();

    const blankComment = await request(app)
      .post(productUrl())
      .set("Cookie", ana.cookie)
      .send({ rating: 5, comment: "   " });
    expect(blankComment.status).toBe(400);
    expect(blankComment.body.fieldErrors.comment).toBeTruthy();
  });
});

describe("PUT /api/reviews/:id", () => {
  it("actualiza la reseña del autor con 200 y cambia updatedAt", async () => {
    const created = await seedReview(productId, ana.id, {
      rating: 5,
      comment: "Antes.",
      createdAt: new Date("2020-01-01T00:00:00Z"),
    });

    const response = await request(app)
      .put(`/api/reviews/${created._id.toString()}`)
      .set("Cookie", ana.cookie)
      .send({ rating: 1, comment: "Después." });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ rating: 1, comment: "Después." });
    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(response.body.createdAt).getTime(),
    );
  });

  it("responde 403 a un no autor", async () => {
    const created = await seedReview(productId, ana.id);

    const response = await request(app)
      .put(`/api/reviews/${created._id.toString()}`)
      .set("Cookie", beto.cookie)
      .send({ rating: 1 });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "No puedes modificar una reseña de otro usuario.",
    );
  });

  it("responde 404 si la reseña no existe", async () => {
    const response = await request(app)
      .put(`/api/reviews/${MISSING_ID}`)
      .set("Cookie", ana.cookie)
      .send({ rating: 1 });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Reseña no encontrada.");
  });

  it("responde 400 si no hay cambios", async () => {
    const created = await seedReview(productId, ana.id);

    const response = await request(app)
      .put(`/api/reviews/${created._id.toString()}`)
      .set("Cookie", ana.cookie)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.form).toBe("No hay cambios para guardar.");
  });

  it("responde 401 sin sesión", async () => {
    const created = await seedReview(productId, ana.id);

    const response = await request(app)
      .put(`/api/reviews/${created._id.toString()}`)
      .send({ rating: 1 });

    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/reviews/:id", () => {
  it("borra la reseña del autor con 204 y recalcula el resumen", async () => {
    const target = await seedReview(productId, ana.id, { rating: 5 });
    await seedReview(productId, beto.id, { rating: 3 });

    const response = await request(app)
      .delete(`/api/reviews/${target._id.toString()}`)
      .set("Cookie", ana.cookie);

    expect(response.status).toBe(204);
    const list = await request(app).get(productUrl());
    expect(list.body.total).toBe(1);
    expect(list.body.promedioRating).toBe(3);
  });

  it("responde 403 a un no autor", async () => {
    const created = await seedReview(productId, ana.id);

    const response = await request(app)
      .delete(`/api/reviews/${created._id.toString()}`)
      .set("Cookie", beto.cookie);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "No puedes modificar una reseña de otro usuario.",
    );
  });

  it("responde 404 si la reseña no existe", async () => {
    const response = await request(app)
      .delete(`/api/reviews/${MISSING_ID}`)
      .set("Cookie", ana.cookie);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Reseña no encontrada.");
  });

  it("permite volver a publicar tras borrar", async () => {
    const created = await seedReview(productId, ana.id);
    await request(app)
      .delete(`/api/reviews/${created._id.toString()}`)
      .set("Cookie", ana.cookie);

    const response = await request(app)
      .post(productUrl())
      .set("Cookie", ana.cookie)
      .send({ rating: 4, comment: "Otra vez." });

    expect(response.status).toBe(201);
  });

  it("responde 401 sin sesión", async () => {
    const created = await seedReview(productId, ana.id);

    const response = await request(app).delete(
      `/api/reviews/${created._id.toString()}`,
    );

    expect(response.status).toBe(401);
  });
});
