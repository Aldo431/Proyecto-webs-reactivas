import type { Express } from "express";
import type { MongoMemoryServer } from "mongodb-memory-server";
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
