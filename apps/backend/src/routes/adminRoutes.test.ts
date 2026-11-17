import type { Express } from "express";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApp } from "../app.ts";
import { Product } from "../models/Product.ts";
import { Review } from "../models/Review.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "../services/authService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import {
  createProduct,
  createSeller,
  makeDataUrl,
  type TestSeller,
} from "../test/productFixtures.ts";
import { seedReview } from "../test/reviewFixtures.ts";

let mongo: MongoMemoryServer;
let app: Express;

const PASSWORD = "secreto123";

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
  app = createApp();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await User.deleteMany({});
  await Product.deleteMany({});
  await Review.deleteMany({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function loginCookie(role?: "user" | "admin"): Promise<string> {
  await User.create({
    username: "anaperez",
    displayName: "Ana Pérez",
    email: "ana@dcc.uchile.cl",
    passwordHash: await hashPassword(PASSWORD),
    ...(role ? { role } : {}),
  });
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "ana@dcc.uchile.cl", password: PASSWORD });
  expect(response.status).toBe(200);
  const raw = response.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = raw?.[0];
  if (!cookie) {
    throw new Error("La respuesta no incluye la cookie de sesión.");
  }
  return cookie;
}

describe("GET /api/admin/session", () => {
  it("responde 401 sin sesión", async () => {
    const response = await request(app).get("/api/admin/session");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Debes iniciar sesión." });
  });

  it("responde 403 con el mensaje de la spec a un usuario normal", async () => {
    const cookie = await loginCookie("user");

    const response = await request(app)
      .get("/api/admin/session")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Solo un administrador puede realizar esta acción.",
    });
  });

  it("trata una cuenta legada sin role como user (403)", async () => {
    const cookie = await loginCookie();
    await User.collection.updateOne(
      { email: "ana@dcc.uchile.cl" },
      { $unset: { role: "" } },
    );

    const response = await request(app)
      .get("/api/admin/session")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
  });

  it("responde 200 { role: 'admin' } a un administrador", async () => {
    const cookie = await loginCookie("admin");

    const response = await request(app)
      .get("/api/admin/session")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ role: "admin" });
  });

  it("aplica un cambio de rol en la base sin volver a iniciar sesión", async () => {
    const cookie = await loginCookie("user");
    const before = await request(app)
      .get("/api/admin/session")
      .set("Cookie", cookie);
    expect(before.status).toBe(403);

    await User.updateOne(
      { email: "ana@dcc.uchile.cl" },
      { $set: { role: "admin" } },
    );
    const promoted = await request(app)
      .get("/api/admin/session")
      .set("Cookie", cookie);
    expect(promoted.status).toBe(200);

    await User.updateOne(
      { email: "ana@dcc.uchile.cl" },
      { $set: { role: "user" } },
    );
    const demoted = await request(app)
      .get("/api/admin/session")
      .set("Cookie", cookie);
    expect(demoted.status).toBe(403);
  });
});

// --- Spec 013: productos -----------------------------------------------------

const MISSING_ID = "6713b0c2a1f4e9d2c8b70a99";

async function createAdmin(username = "admina"): Promise<TestSeller> {
  const admin = await createSeller(app, username);
  await User.updateOne({ _id: admin.id }, { $set: { role: "admin" } });
  return admin;
}

describe("acceso a las rutas de productos del panel", () => {
  const routes: Array<[string, string, string]> = [
    ["GET", "/api/admin/products", "listado"],
    ["PATCH", `/api/admin/products/${MISSING_ID}/featured`, "destacar"],
    ["DELETE", `/api/admin/products/${MISSING_ID}`, "eliminar"],
  ];

  it.each(routes)("%s %s (%s) responde 401 sin sesión", async (method, url) => {
    const response = await request(app)[
      method.toLowerCase() as "get" | "patch" | "delete"
    ](url);

    expect(response.status).toBe(401);
  });

  it.each(routes)(
    "%s %s (%s) responde 403 a un usuario normal",
    async (method, url) => {
      const user = await createSeller(app, "normal");

      const response = await request(app)[
        method.toLowerCase() as "get" | "patch" | "delete"
      ](url).set("Cookie", user.cookie);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "Solo un administrador puede realizar esta acción.",
      );
    },
  );
});

describe("GET /api/admin/products", () => {
  let admin: TestSeller;
  let ana: TestSeller;
  let beto: TestSeller;

  beforeEach(async () => {
    admin = await createAdmin();
    ana = await createSeller(app, "anaperez", "Ana Pérez");
    beto = await createSeller(app, "betoruiz", "Beto Ruiz");
  });

  function list(query = "") {
    return request(app)
      .get(`/api/admin/products${query}`)
      .set("Cookie", admin.cookie);
  }

  it("lista productos de cualquier vendedor, del más reciente al más antiguo", async () => {
    await createProduct(ana.id, {
      name: "Vieja",
      createdAt: new Date("2026-10-01T10:00:00Z"),
    });
    await createProduct(beto.id, {
      name: "Nueva",
      createdAt: new Date("2026-11-01T10:00:00Z"),
    });

    const response = await list();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 2,
      pagina: 1,
      porPagina: 20,
      totalPaginas: 1,
    });
    expect(response.body.items.map((p: { name: string }) => p.name)).toEqual([
      "Nueva",
      "Vieja",
    ]);
    expect(response.body.items[0]).toEqual({
      id: expect.any(String),
      name: "Nueva",
      description: "Descripción de prueba.",
      category: "Tazas",
      price: 6000,
      image: "/images/taza-dcc.png",
      featured: false,
      seller: { id: beto.id, username: "betoruiz", displayName: "Beto Ruiz" },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      reviewCount: 0,
      averageRating: null,
    });
  });

  it("no incluye el base64 de las imágenes subidas", async () => {
    const product = await createProduct(ana.id, { image: makeDataUrl() });

    const response = await list();

    expect(response.body.items[0].image).toMatch(
      new RegExp(`^/api/products/${product._id.toString()}/image\\?v=\\d+$`),
    );
    expect(JSON.stringify(response.body)).not.toContain("base64");
  });

  it("filtra por categoría y por destacados", async () => {
    await createProduct(ana.id, { name: "Taza", category: "Tazas" });
    await createProduct(ana.id, {
      name: "Polera destacada",
      category: "Poleras",
      featured: true,
    });
    await createProduct(ana.id, { name: "Polera", category: "Poleras" });

    const byCategory = await list("?categoria=Poleras");
    expect(byCategory.body.total).toBe(2);

    const featured = await list("?destacados=true");
    expect(featured.body.items.map((p: { name: string }) => p.name)).toEqual([
      "Polera destacada",
    ]);

    const both = await list("?categoria=Tazas&destacados=true");
    expect(both.body.total).toBe(0);
  });

  it("busca por nombre sin distinguir mayúsculas ni tildes", async () => {
    await createProduct(ana.id, { name: "Polerón CC5003" });
    await createProduct(ana.id, { name: "Taza" });

    const response = await list("?q=POLERON");

    expect(response.body.items.map((p: { name: string }) => p.name)).toEqual([
      "Polerón CC5003",
    ]);
  });

  it("busca por username del vendedor", async () => {
    await createProduct(ana.id, { name: "De Ana" });
    await createProduct(beto.id, { name: "De Beto" });

    const response = await list("?q=Betoru");

    expect(response.body.items.map((p: { name: string }) => p.name)).toEqual([
      "De Beto",
    ]);
  });

  it("trata el texto de búsqueda como literal, no como regex", async () => {
    await createProduct(ana.id, { name: "Taza" });

    const response = await list("?q=.*");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
  });

  it("pagina de a 20 y ajusta una página excedida a la última", async () => {
    for (let index = 0; index < 21; index += 1) {
      await createProduct(ana.id, {
        name: `P${index}`,
        createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)),
      });
    }

    const first = await list();
    expect(first.body.items).toHaveLength(20);
    expect(first.body).toMatchObject({ total: 21, pagina: 1, totalPaginas: 2 });

    const second = await list("?pagina=2");
    expect(second.body.items.map((p: { name: string }) => p.name)).toEqual([
      "P0",
    ]);

    const beyond = await list("?pagina=99");
    expect(beyond.body.pagina).toBe(2);
    expect(beyond.body.items).toHaveLength(1);
  });

  it("sin resultados responde pagina 1 y totalPaginas 0", async () => {
    const response = await list();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [],
      total: 0,
      pagina: 1,
      porPagina: 20,
      totalPaginas: 0,
    });
  });

  it("agrega reviewCount y averageRating (1 decimal) con una sola agregación", async () => {
    const rated = await createProduct(ana.id, { name: "Con reseñas" });
    await createProduct(ana.id, { name: "Sin reseñas" });
    const carla = await createSeller(app, "carla");
    await seedReview(rated._id.toString(), ana.id, { rating: 5 });
    await seedReview(rated._id.toString(), beto.id, { rating: 4 });
    await seedReview(rated._id.toString(), carla.id, { rating: 4 });
    const aggregate = vi.spyOn(Review, "aggregate");

    const response = await list();

    const byName = Object.fromEntries(
      response.body.items.map(
        (p: { name: string; reviewCount: number; averageRating: number | null }) => [
          p.name,
          p,
        ],
      ),
    );
    expect(byName["Con reseñas"]).toMatchObject({
      reviewCount: 3,
      averageRating: 4.3,
    });
    expect(byName["Sin reseñas"]).toMatchObject({
      reviewCount: 0,
      averageRating: null,
    });
    expect(aggregate).toHaveBeenCalledTimes(1);
  });

  it("omite productos cuyo vendedor ya no existe", async () => {
    await createProduct(ana.id, { name: "Visible" });
    await createProduct(MISSING_ID, { name: "Huérfano" });

    const response = await list();

    expect(response.body.items.map((p: { name: string }) => p.name)).toEqual([
      "Visible",
    ]);
  });

  it.each([
    ["pagina=0", "?pagina=0"],
    ["categoria inválida", "?categoria=Zapatos"],
    ["destacados=false", "?destacados=false"],
    ["q demasiado larga", `?q=${"a".repeat(101)}`],
  ])("responde 400 con %s", async (_label, query) => {
    const response = await list(query);

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toBeDefined();
  });
});

describe("PATCH /api/admin/products/:id/featured", () => {
  let admin: TestSeller;
  let ana: TestSeller;

  beforeEach(async () => {
    admin = await createAdmin();
    ana = await createSeller(app, "anaperez", "Ana Pérez");
  });

  function setFeatured(id: string, body: unknown) {
    return request(app)
      .patch(`/api/admin/products/${id}/featured`)
      .set("Cookie", admin.cookie)
      .send(body as object);
  }

  it("destaca un producto ajeno y responde 200 con el formato del listado", async () => {
    const product = await createProduct(ana.id, { name: "Taza" });
    await seedReview(product._id.toString(), admin.id, { rating: 3 });

    const response = await setFeatured(product._id.toString(), {
      featured: true,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: product._id.toString(),
      featured: true,
      reviewCount: 1,
      averageRating: 3,
      seller: { username: "anaperez" },
    });
  });

  it("se refleja en GET /api/products?featured=true y se puede quitar", async () => {
    const product = await createProduct(ana.id, { name: "Taza" });
    const id = product._id.toString();

    await setFeatured(id, { featured: true });
    const shown = await request(app).get("/api/products?featured=true");
    expect(shown.body.map((p: { id: string }) => p.id)).toEqual([id]);

    const removed = await setFeatured(id, { featured: false });
    expect(removed.body.featured).toBe(false);
    const hidden = await request(app).get("/api/products?featured=true");
    expect(hidden.body).toEqual([]);
  });

  it("responde 200 al asignar el valor que ya tenía", async () => {
    const product = await createProduct(ana.id, { featured: true });

    const response = await setFeatured(product._id.toString(), {
      featured: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.featured).toBe(true);
  });

  it("actualiza updatedAt y cambia el ?v= de la imagen subida", async () => {
    const product = await createProduct(ana.id, { image: makeDataUrl() });
    const id = product._id.toString();
    const before = await request(app).get(`/api/products/${id}`);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const response = await setFeatured(id, { featured: true });

    expect(response.body.updatedAt).not.toBe(before.body.updatedAt);
    expect(response.body.image).not.toBe(before.body.image);
    const image = await request(app).get(response.body.image);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toBe("image/png");
  });

  it.each([
    ["sin featured", {}],
    ["featured como texto", { featured: "true" }],
    ["featured nulo", { featured: null }],
  ])("responde 400 %s con el mensaje de la spec", async (_label, body) => {
    const product = await createProduct(ana.id);

    const response = await setFeatured(product._id.toString(), body);

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.featured).toBe(
      "Indica si el producto es destacado.",
    );
    expect((await Product.findById(product._id))?.featured).toBe(false);
  });

  it.each([
    ["inexistente", MISSING_ID],
    ["inválido", "taza-dcc"],
  ])("responde 404 para un id %s, aun con cuerpo inválido", async (_label, id) => {
    const response = await setFeatured(id, {});

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Producto no encontrado.");
  });
});

describe("DELETE /api/admin/products/:id", () => {
  let admin: TestSeller;
  let ana: TestSeller;
  let beto: TestSeller;

  beforeEach(async () => {
    admin = await createAdmin();
    ana = await createSeller(app, "anaperez", "Ana Pérez");
    beto = await createSeller(app, "betoruiz", "Beto Ruiz");
  });

  function remove(id: string) {
    return request(app)
      .delete(`/api/admin/products/${id}`)
      .set("Cookie", admin.cookie);
  }

  it("responde 204 y elimina un producto de otro usuario", async () => {
    const product = await createProduct(ana.id);
    const other = await createProduct(ana.id);

    const response = await remove(product._id.toString());

    expect(response.status).toBe(204);
    expect(await Product.findById(product._id)).toBeNull();
    expect(await Product.findById(other._id)).not.toBeNull();
    const again = await request(app).get(
      `/api/products/${product._id.toString()}`,
    );
    expect(again.status).toBe(404);
  });

  it("quita el id de favoritos, historial y carrito de todas las cuentas", async () => {
    const doomed = await createProduct(ana.id);
    const kept = await createProduct(ana.id);
    const doomedId = doomed._id.toString();
    const keptId = kept._id.toString();
    const viewedAt = new Date("2026-10-13T10:00:00Z");
    const references = {
      favorites: [doomedId, keptId],
      history: [
        { productId: doomedId, viewedAt },
        { productId: keptId, viewedAt },
      ],
      cart: [
        { productId: doomedId, quantity: 2 },
        { productId: keptId, quantity: 1 },
      ],
    };
    await User.updateOne({ _id: ana.id }, references);
    await User.updateOne({ _id: beto.id }, references);

    const response = await remove(doomedId);

    expect(response.status).toBe(204);
    for (const userId of [ana.id, beto.id]) {
      const user = await User.findById(userId).lean();
      expect(user?.favorites).toEqual([keptId]);
      expect(user?.history.map((visit) => visit.productId)).toEqual([keptId]);
      expect(user?.cart.map((line) => line.productId)).toEqual([keptId]);
    }
  });

  it("borra las reseñas del producto y conserva las demás", async () => {
    const doomed = await createProduct(ana.id);
    const kept = await createProduct(ana.id);
    await seedReview(doomed._id.toString(), beto.id);
    await seedReview(doomed._id.toString(), admin.id, { rating: 1 });
    await seedReview(kept._id.toString(), beto.id);

    const response = await remove(doomed._id.toString());

    expect(response.status).toBe(204);
    expect(await Review.countDocuments({ product: doomed._id })).toBe(0);
    expect(await Review.countDocuments({ product: kept._id })).toBe(1);
  });

  it.each([
    ["inexistente", MISSING_ID],
    ["inválido", "taza-dcc"],
  ])("responde 404 para un id %s", async (_label, id) => {
    const response = await remove(id);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Producto no encontrado.");
  });

  it("responde 404 si el producto ya fue eliminado", async () => {
    const product = await createProduct(ana.id);
    await remove(product._id.toString());

    const again = await remove(product._id.toString());

    expect(again.status).toBe(404);
  });
});

// --- Spec 013: usuarios ------------------------------------------------------

describe("GET /api/admin/users", () => {
  let admin: TestSeller;

  beforeEach(async () => {
    admin = await createAdmin();
  });

  function list(query = "") {
    return request(app)
      .get(`/api/admin/users${query}`)
      .set("Cookie", admin.cookie);
  }

  async function insertUser(
    username: string,
    createdAt: Date,
    extra: Record<string, unknown> = {},
  ) {
    const { insertedId } = await User.collection.insertOne({
      username,
      displayName: username,
      email: `${username}@dcc.uchile.cl`,
      passwordHash: "hash",
      createdAt,
      updatedAt: createdAt,
      ...extra,
    });
    return insertedId.toString();
  }

  it("lista del registro más reciente al más antiguo con el formato de la spec", async () => {
    await insertUser("vieja", new Date("2020-01-01T00:00:00Z"));
    await insertUser("nueva", new Date("2030-01-01T00:00:00Z"), {
      emailVerified: true,
    });

    const response = await list();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 3,
      pagina: 1,
      porPagina: 20,
      totalPaginas: 1,
    });
    expect(
      response.body.items.map((u: { username: string }) => u.username),
    ).toEqual(["nueva", "admina", "vieja"]);
    expect(response.body.items[0]).toEqual({
      id: expect.any(String),
      username: "nueva",
      displayName: "nueva",
      email: "nueva@dcc.uchile.cl",
      role: "user",
      emailVerified: true,
      productCount: 0,
      reviewCount: 0,
      createdAt: "2030-01-01T00:00:00.000Z",
    });
  });

  it("nunca expone campos sensibles", async () => {
    await User.updateOne(
      { _id: admin.id },
      {
        resetToken: "a".repeat(64),
        favorites: ["p1"],
        cart: [{ productId: "p1", quantity: 1 }],
      },
    );

    const response = await list();

    const [item] = response.body.items;
    expect(Object.keys(item).sort()).toEqual(
      [
        "createdAt",
        "displayName",
        "email",
        "emailVerified",
        "id",
        "productCount",
        "reviewCount",
        "role",
        "username",
      ].sort(),
    );
    const text = JSON.stringify(response.body);
    for (const forbidden of [
      "passwordHash",
      "resetToken",
      "sessionVersion",
      "favorites",
      "history",
      "cart",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("cuenta publicaciones y reseñas con una agregación por conteo", async () => {
    const ana = await createSeller(app, "anaperez", "Ana Pérez");
    const beto = await createSeller(app, "betoruiz", "Beto Ruiz");
    const first = await createProduct(ana.id);
    const second = await createProduct(ana.id);
    await seedReview(first._id.toString(), beto.id);
    await seedReview(second._id.toString(), beto.id);
    await seedReview(first._id.toString(), ana.id);
    const productAggregate = vi.spyOn(Product, "aggregate");
    const reviewAggregate = vi.spyOn(Review, "aggregate");

    const response = await list();

    const byName = Object.fromEntries(
      response.body.items.map(
        (u: { username: string; productCount: number; reviewCount: number }) => [
          u.username,
          u,
        ],
      ),
    );
    expect(byName.anaperez).toMatchObject({ productCount: 2, reviewCount: 1 });
    expect(byName.betoruiz).toMatchObject({ productCount: 0, reviewCount: 2 });
    expect(byName.admina).toMatchObject({ productCount: 0, reviewCount: 0 });
    expect(productAggregate).toHaveBeenCalledTimes(1);
    expect(reviewAggregate).toHaveBeenCalledTimes(1);
  });

  it("busca por nombre, usuario o correo sin distinguir mayúsculas ni tildes", async () => {
    await createSeller(app, "anaperez", "Ana Pérez");
    await createSeller(app, "betoruiz", "Beto Ruiz");

    const byName = await list("?q=PEREZ");
    expect(byName.body.items.map((u: { username: string }) => u.username)).toEqual([
      "anaperez",
    ]);

    const byUsername = await list("?q=betor");
    expect(
      byUsername.body.items.map((u: { username: string }) => u.username),
    ).toEqual(["betoruiz"]);

    const byEmail = await list("?q=ANAPEREZ@dcc");
    expect(byEmail.body.total).toBe(1);

    const literal = await list("?q=.*");
    expect(literal.body.total).toBe(0);
  });

  it("filtra por rol y rol=user incluye cuentas legadas sin role", async () => {
    await createSeller(app, "anaperez");
    await insertUser("legada", new Date("2020-01-01T00:00:00Z"));
    const stored = await User.collection.findOne({ username: "legada" });
    expect(stored).not.toHaveProperty("role");

    const admins = await list("?rol=admin");
    expect(admins.body.items.map((u: { username: string }) => u.username)).toEqual([
      "admina",
    ]);

    const users = await list("?rol=user");
    expect(
      users.body.items.map((u: { username: string }) => u.username).sort(),
    ).toEqual(["anaperez", "legada"]);
    expect(
      users.body.items.find((u: { username: string }) => u.username === "legada")
        .role,
    ).toBe("user");
  });

  it("pagina de a 20 y ajusta una página excedida a la última", async () => {
    for (let index = 0; index < 21; index += 1) {
      await insertUser(
        `u${String(index).padStart(2, "0")}`,
        new Date(Date.UTC(2026, 9, 1, 0, index)),
      );
    }

    const first = await list();
    expect(first.body.items).toHaveLength(20);
    expect(first.body).toMatchObject({ total: 22, pagina: 1, totalPaginas: 2 });

    const beyond = await list("?pagina=99");
    expect(beyond.body.pagina).toBe(2);
    expect(beyond.body.items).toHaveLength(2);
  });

  it.each([
    ["rol inválido", "?rol=root"],
    ["pagina=0", "?pagina=0"],
  ])("responde 400 con %s", async (_label, query) => {
    const response = await list(query);

    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/admin/users/:id/role", () => {
  let admin: TestSeller;
  let ana: TestSeller;

  beforeEach(async () => {
    admin = await createAdmin();
    ana = await createSeller(app, "anaperez", "Ana Pérez");
  });

  function setRole(id: string, body: unknown, cookie = admin.cookie) {
    return request(app)
      .patch(`/api/admin/users/${id}/role`)
      .set("Cookie", cookie)
      .send(body as object);
  }

  it("da el rol de administrador y responde 200 con el formato del listado", async () => {
    const response = await setRole(ana.id, { role: "admin" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: ana.id,
      username: "anaperez",
      role: "admin",
      productCount: 0,
      reviewCount: 0,
    });
    expect((await User.findById(ana.id))?.role).toBe("admin");
  });

  it("aplica en la siguiente solicitud del afectado, al dar y al quitar el rol", async () => {
    const before = await request(app)
      .get("/api/admin/session")
      .set("Cookie", ana.cookie);
    expect(before.status).toBe(403);

    await setRole(ana.id, { role: "admin" });
    const promoted = await request(app)
      .get("/api/admin/session")
      .set("Cookie", ana.cookie);
    expect(promoted.status).toBe(200);

    const demoted = await setRole(ana.id, { role: "user" });
    expect(demoted.body.role).toBe("user");
    const after = await request(app)
      .get("/api/admin/session")
      .set("Cookie", ana.cookie);
    expect(after.status).toBe(403);
  });

  it("responde 200 al asignar el rol que ya tenía", async () => {
    const response = await setRole(ana.id, { role: "user" });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("user");
  });

  it("responde 403 si el administrador cambia su propio rol y no lo cambia", async () => {
    const response = await setRole(admin.id, { role: "user" });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("No puedes cambiar tu propio rol.");
    expect((await User.findById(admin.id))?.role).toBe("admin");
  });

  it.each([
    ["sin role", {}],
    ["role desconocido", { role: "root" }],
    ["role numérico", { role: 1 }],
  ])("responde 400 %s con 'Rol inválido.'", async (_label, body) => {
    const response = await setRole(ana.id, body);

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.role).toBe("Rol inválido.");
    expect((await User.findById(ana.id))?.role).toBe("user");
  });

  it.each([
    ["inexistente", MISSING_ID],
    ["inválido", "anaperez"],
  ])("responde 404 para un id %s, aun con cuerpo inválido", async (_label, id) => {
    const response = await setRole(id, {});

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Usuario no encontrado.");
  });
});

// --- Spec 013: reseñas -------------------------------------------------------

describe("GET /api/admin/reviews", () => {
  let admin: TestSeller;
  let ana: TestSeller;
  let beto: TestSeller;
  let carla: TestSeller;

  beforeEach(async () => {
    admin = await createAdmin();
    ana = await createSeller(app, "anaperez", "Ana Pérez");
    beto = await createSeller(app, "betoruiz", "Beto Ruiz");
    carla = await createSeller(app, "carla", "Carla");
  });

  function list(query = "") {
    return request(app)
      .get(`/api/admin/reviews${query}`)
      .set("Cookie", admin.cookie);
  }

  async function seedRatings() {
    const taza = await createProduct(ana.id, { name: "Taza" });
    const polera = await createProduct(ana.id, { name: "Polera" });
    const tazaId = taza._id.toString();
    const poleraId = polera._id.toString();
    await seedReview(tazaId, beto.id, {
      rating: 5,
      comment: "Excelente",
      createdAt: new Date("2026-11-01T10:00:00Z"),
    });
    await seedReview(tazaId, carla.id, {
      rating: 1,
      comment: "Mala",
      createdAt: new Date("2026-11-02T10:00:00Z"),
    });
    await seedReview(poleraId, beto.id, {
      rating: 2,
      comment: "Regular",
      createdAt: new Date("2026-11-03T10:00:00Z"),
    });
    await seedReview(poleraId, carla.id, {
      rating: 4,
      comment: "Buena",
      createdAt: new Date("2026-11-04T10:00:00Z"),
    });
    return { tazaId, poleraId };
  }

  it("lista todas, más recientes primero, con el producto y el autor", async () => {
    const { poleraId } = await seedRatings();

    const response = await list();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 4,
      pagina: 1,
      porPagina: 20,
      totalPaginas: 1,
    });
    expect(
      response.body.items.map((r: { comment: string }) => r.comment),
    ).toEqual(["Buena", "Regular", "Mala", "Excelente"]);
    expect(response.body.items[0]).toEqual({
      id: expect.any(String),
      productId: poleraId,
      product: { id: poleraId, name: "Polera" },
      author: { id: carla.id, username: "carla", displayName: "Carla" },
      rating: 4,
      comment: "Buena",
      createdAt: "2026-11-04T10:00:00.000Z",
      updatedAt: expect.any(String),
    });
  });

  it("filtra bajas (1-2) y altas (4-5)", async () => {
    await seedRatings();

    const low = await list("?calificacion=bajas");
    expect(low.body.items.map((r: { rating: number }) => r.rating)).toEqual([
      2, 1,
    ]);

    const high = await list("?calificacion=altas");
    expect(high.body.items.map((r: { rating: number }) => r.rating)).toEqual([
      4, 5,
    ]);
  });

  it("ordena por menor calificación y luego por más reciente", async () => {
    const { tazaId } = await seedRatings();
    const diego = await createSeller(app, "diego", "Diego");
    await seedReview(tazaId, diego.id, {
      rating: 1,
      comment: "Mala y más nueva",
      createdAt: new Date("2026-11-10T10:00:00Z"),
    });

    const response = await list("?orden=menor");

    expect(
      response.body.items.map((r: { comment: string }) => r.comment),
    ).toEqual(["Mala y más nueva", "Mala", "Regular", "Buena", "Excelente"]);
  });

  it("excluye las reseñas huérfanas, de producto o de autor inexistente", async () => {
    const { tazaId } = await seedRatings();
    await seedReview(MISSING_ID, beto.id, { comment: "Producto borrado" });
    await Review.collection.insertOne({
      product: new Types.ObjectId(tazaId),
      author: new Types.ObjectId(MISSING_ID),
      rating: 3,
      comment: "Autor inexistente",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await list();

    expect(response.body.total).toBe(4);
    const comments = response.body.items.map((r: { comment: string }) => r.comment);
    expect(comments).not.toContain("Producto borrado");
    expect(comments).not.toContain("Autor inexistente");
  });

  it("pagina de a 20 y ajusta una página excedida a la última", async () => {
    const product = await createProduct(ana.id);
    const productId = product._id.toString();
    for (let index = 0; index < 21; index += 1) {
      const author = await User.create({
        username: `r${index}`,
        displayName: `R${index}`,
        email: `r${index}@dcc.uchile.cl`,
        passwordHash: "hash",
      });
      await seedReview(productId, author._id.toString(), {
        comment: `C${index}`,
        createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)),
      });
    }

    const second = await list("?pagina=2");
    expect(second.body.items.map((r: { comment: string }) => r.comment)).toEqual([
      "C0",
    ]);

    const beyond = await list("?pagina=99");
    expect(beyond.body).toMatchObject({ pagina: 2, total: 21, totalPaginas: 2 });
    expect(beyond.body.items).toHaveLength(1);
  });

  it("sin resultados responde pagina 1 y totalPaginas 0", async () => {
    const response = await list("?calificacion=bajas");

    expect(response.body).toEqual({
      items: [],
      total: 0,
      pagina: 1,
      porPagina: 20,
      totalPaginas: 0,
    });
  });

  it.each([
    ["calificacion", "?calificacion=medias"],
    ["orden", "?orden=antiguas"],
    ["pagina", "?pagina=0"],
  ])("responde 400 con %s inválido", async (_label, query) => {
    const response = await list(query);

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/admin/reviews/:id", () => {
  let admin: TestSeller;
  let ana: TestSeller;
  let beto: TestSeller;

  beforeEach(async () => {
    admin = await createAdmin();
    ana = await createSeller(app, "anaperez", "Ana Pérez");
    beto = await createSeller(app, "betoruiz", "Beto Ruiz");
  });

  function remove(id: string) {
    return request(app)
      .delete(`/api/admin/reviews/${id}`)
      .set("Cookie", admin.cookie);
  }

  it("responde 204 al borrar la reseña de otro usuario y recalcula el promedio público", async () => {
    const product = await createProduct(ana.id);
    const productId = product._id.toString();
    await seedReview(productId, ana.id, { rating: 5 });
    const low = await seedReview(productId, beto.id, { rating: 1 });
    const before = await request(app).get(`/api/products/${productId}/reviews`);
    expect(before.body).toMatchObject({ total: 2, promedioRating: 3 });

    const response = await remove(low._id.toString());

    expect(response.status).toBe(204);
    expect(await Review.findById(low._id)).toBeNull();
    const after = await request(app).get(`/api/products/${productId}/reviews`);
    expect(after.body).toMatchObject({ total: 1, promedioRating: 5 });
  });

  it.each([
    ["inexistente", MISSING_ID],
    ["inválido", "reseña"],
  ])("responde 404 para un id %s", async (_label, id) => {
    const response = await remove(id);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Reseña no encontrada.");
  });

  it("responde 404 si la reseña ya fue eliminada", async () => {
    const product = await createProduct(ana.id);
    const review = await seedReview(product._id.toString(), beto.id);
    await remove(review._id.toString());

    const again = await remove(review._id.toString());

    expect(again.status).toBe(404);
  });
});
