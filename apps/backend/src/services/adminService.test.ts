import type { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminOverviewSchema } from "@tiendadcc/utils";
import { Product } from "../models/Product.ts";
import { Review } from "../models/Review.ts";
import { User } from "../models/User.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import { createProduct } from "../test/productFixtures.ts";
import { seedReview } from "../test/reviewFixtures.ts";
import { getOverview } from "./adminService.ts";

let mongo: MongoMemoryReplSet;

const NOW = new Date("2026-11-17T12:00:00Z");
const MISSING_ID = "6713b0c2a1f4e9d2c8b70a99";

beforeAll(async () => {
  mongo = await startTestDatabase();
  await Review.syncIndexes();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Review.deleteMany({}),
  ]);
});

async function makeUser(
  username: string,
  createdAt: string,
  role?: "admin",
): Promise<string> {
  const user = await User.create({
    username,
    displayName: username,
    email: `${username}@dcc.uchile.cl`,
    passwordHash: "hash",
    createdAt: new Date(createdAt),
    ...(role ? { role } : {}),
  });
  return user._id.toString();
}

describe("getOverview con la base vacía", () => {
  it("responde ceros, listas vacías y averageRating nulo", async () => {
    const overview = await getOverview(NOW);

    expect(overview).toEqual({
      users: { total: 0, newLast7Days: 0, admins: 0 },
      products: {
        total: 0,
        featured: 0,
        byCategory: [
          { category: "Tazas", count: 0 },
          { category: "Poleras", count: 0 },
          { category: "Stickers", count: 0 },
          { category: "Pins", count: 0 },
        ],
      },
      reviews: {
        total: 0,
        newLast7Days: 0,
        averageRating: null,
        lowLast7Days: 0,
      },
      activity: [],
      latestProducts: [],
      lowReviews: [],
    });
    expect(adminOverviewSchema.safeParse(overview).success).toBe(true);
  });
});

describe("getOverview con datos", () => {
  // `now` = 2026-11-17 12:00; "últimos 7 días" = desde 2026-11-10 12:00.
  async function seed() {
    const admin = await makeUser("admina", "2026-11-01T10:00:00Z", "admin");
    const ana = await makeUser("anaperez", "2026-11-12T10:00:00Z");
    const beto = await makeUser("betoruiz", "2026-11-16T10:00:00Z");
    const carla = await makeUser("carla", "2026-10-01T10:00:00Z");

    const taza = await createProduct(ana, {
      name: "Taza",
      category: "Tazas",
      featured: true,
      createdAt: new Date("2026-11-14T10:00:00Z"),
    });
    const polera = await createProduct(beto, {
      name: "Polera",
      category: "Poleras",
      createdAt: new Date("2026-11-15T10:00:00Z"),
    });
    const vieja = await createProduct(ana, {
      name: "Taza vieja",
      category: "Tazas",
      createdAt: new Date("2026-10-20T10:00:00Z"),
    });
    for (const [index, name] of ["A", "B", "C"].entries()) {
      await createProduct(carla, {
        name: `Pin ${name}`,
        category: "Pins",
        createdAt: new Date(`2026-10-0${index + 2}T10:00:00Z`),
      });
    }

    const tazaId = taza._id.toString();
    const poleraId = polera._id.toString();
    const viejaId = vieja._id.toString();
    await seedReview(tazaId, beto, {
      rating: 1,
      comment: "Baja nueva",
      createdAt: new Date("2026-11-16T11:00:00Z"),
    });
    await seedReview(poleraId, ana, {
      rating: 5,
      comment: "Alta nueva",
      createdAt: new Date("2026-11-15T11:00:00Z"),
    });
    await seedReview(tazaId, carla, {
      rating: 2,
      comment: "Baja nueva 2",
      createdAt: new Date("2026-11-12T11:00:00Z"),
    });
    await seedReview(viejaId, admin, {
      rating: 2,
      comment: "Baja vieja",
      createdAt: new Date("2026-11-01T11:00:00Z"),
    });
    // Huérfana: producto inexistente. No debe contarse ni listarse.
    await seedReview(MISSING_ID, beto, {
      rating: 1,
      comment: "Huérfana",
      createdAt: new Date("2026-11-16T12:00:00Z"),
    });
  }

  it("cuenta usuarios, productos y reseñas", async () => {
    await seed();

    const overview = await getOverview(NOW);

    expect(overview.users).toEqual({ total: 4, newLast7Days: 2, admins: 1 });
    expect(overview.products.total).toBe(6);
    expect(overview.products.featured).toBe(1);
  });

  it("trae las cuatro categorías en orden, incluidas las de 0", async () => {
    await seed();

    const { byCategory } = (await getOverview(NOW)).products;

    expect(byCategory).toEqual([
      { category: "Tazas", count: 2 },
      { category: "Poleras", count: 1 },
      { category: "Stickers", count: 0 },
      { category: "Pins", count: 3 },
    ]);
  });

  it("calcula el promedio con 1 decimal y excluye la reseña huérfana", async () => {
    await seed();

    const { reviews } = await getOverview(NOW);

    // (1 + 5 + 2 + 2) / 4 = 2,5; la huérfana (1 estrella) no cuenta.
    expect(reviews).toEqual({
      total: 4,
      newLast7Days: 3,
      averageRating: 2.5,
      lowLast7Days: 2,
    });
  });

  it("redondea el promedio a 1 decimal", async () => {
    const author1 = await makeUser("u1", "2026-11-01T10:00:00Z");
    const author2 = await makeUser("u2", "2026-11-01T10:00:00Z");
    const author3 = await makeUser("u3", "2026-11-01T10:00:00Z");
    const product = await createProduct(author1);
    for (const [author, rating] of [
      [author1, 5],
      [author2, 4],
      [author3, 4],
    ] as const) {
      await seedReview(product._id.toString(), author, { rating });
    }

    const { reviews } = await getOverview(new Date());

    expect(reviews.averageRating).toBe(4.3);
  });

  it("cuenta 'últimos 7 días' desde el instante inyectado", async () => {
    await seed();

    const early = await getOverview(new Date("2026-11-13T00:00:00Z"));

    // Desde 2026-11-06 (ahora - 7 días): ana (11-12) y beto (11-16) cumplen
    // `createdAt >= since`; admina (11-01) y carla (10-01) no.
    expect(early.users.newLast7Days).toBe(2);
    const later = await getOverview(new Date("2026-12-31T00:00:00Z"));
    expect(later.users.newLast7Days).toBe(0);
    expect(later.reviews.newLast7Days).toBe(0);
    expect(later.reviews.lowLast7Days).toBe(0);
    expect(later.lowReviews).toEqual([]);
  });

  it("trae los 4 productos más recientes con el formato público", async () => {
    await seed();

    const { latestProducts } = await getOverview(NOW);

    expect(latestProducts.map((product) => product.name)).toEqual([
      "Polera",
      "Taza",
      "Taza vieja",
      "Pin C",
    ]);
    expect(latestProducts[0]).toMatchObject({
      id: expect.any(String),
      seller: { username: "betoruiz" },
      image: "/images/taza-dcc.png",
    });
  });

  it("trae hasta 3 reseñas bajas de los últimos 7 días, más recientes primero", async () => {
    await seed();

    const { lowReviews } = await getOverview(NOW);

    expect(lowReviews.map((review) => review.comment)).toEqual([
      "Baja nueva",
      "Baja nueva 2",
    ]);
    expect(lowReviews[0]).toMatchObject({
      rating: 1,
      author: { username: "betoruiz" },
      product: { name: "Taza" },
    });
  });

  it("limita las reseñas por revisar a 3", async () => {
    const product = await createProduct(await makeUser("dueno", "2026-11-01T00:00:00Z"));
    for (let index = 0; index < 5; index += 1) {
      const author = await makeUser(`r${index}`, "2026-11-01T00:00:00Z");
      await seedReview(product._id.toString(), author, {
        rating: 1,
        createdAt: new Date(Date.UTC(2026, 10, 15, index)),
      });
    }

    const { lowReviews } = await getOverview(NOW);

    expect(lowReviews).toHaveLength(3);
    expect(lowReviews[0]?.createdAt).toBe("2026-11-15T04:00:00.000Z");
  });

  it("mezcla la actividad, la ordena del más reciente al más antiguo y la corta en 8", async () => {
    await seed();

    const { activity } = await getOverview(NOW);

    expect(activity).toHaveLength(8);
    const instants = activity.map((event) => event.at);
    expect(instants).toEqual([...instants].sort().reverse());
    // La reseña de las 11:00 es más reciente que el registro de las 10:00.
    expect(activity[0]).toEqual({
      type: "review_created",
      at: "2026-11-16T11:00:00.000Z",
      user: { username: "betoruiz" },
      product: { id: expect.any(String), name: "Taza" },
      rating: 1,
    });
    expect(activity[1]).toEqual({
      type: "user_registered",
      at: "2026-11-16T10:00:00.000Z",
      user: { username: "betoruiz" },
    });
    expect(new Set(activity.map((event) => event.type))).toEqual(
      new Set(["user_registered", "product_published", "review_created"]),
    );
    // La reseña huérfana (11-16 12:00) no aparece en la actividad.
    expect(activity.map((event) => event.at)).not.toContain(
      "2026-11-16T12:00:00.000Z",
    );
  });

  it("produce una respuesta válida según adminOverviewSchema", async () => {
    await seed();

    const overview = await getOverview(NOW);

    expect(adminOverviewSchema.safeParse(overview).success).toBe(true);
  });
});
