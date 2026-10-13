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
import { MAX_IMAGE_BYTES } from "@tiendadcc/utils";
import { createApp } from "../app.ts";
import { Product } from "../models/Product.ts";
import { User } from "../models/User.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import {
  createProduct,
  createSeller,
  makeDataUrl,
  makeImageBytes,
  type TestSeller,
} from "../test/productFixtures.ts";

let mongo: MongoMemoryServer;
let app: Express;
let ana: TestSeller;
let beto: TestSeller;

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
  await Product.syncIndexes();
  app = createApp();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await Product.deleteMany({});
  await User.deleteMany({});
  ana = await createSeller(app, "anaperez", "Ana Pérez");
  beto = await createSeller(app, "betoruiz", "Beto Ruiz");
});

afterEach(() => {
  vi.restoreAllMocks();
});

const NOT_OWNER = "No puedes modificar una publicación de otro usuario.";
const MISSING_ID = "6713b0c2a1f4e9d2c8b70a99";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Polerón CC5003",
    description: "Polerón gris con el logo del curso.",
    category: "Poleras",
    price: 18000,
    image: makeDataUrl("image/png"),
    ...overrides,
  };
}

function publish(body: unknown, seller: TestSeller = ana) {
  return request(app)
    .post("/api/products")
    .set("Cookie", seller.cookie)
    .send(body as object);
}

function edit(id: string, body: unknown, seller: TestSeller = ana) {
  return request(app)
    .patch(`/api/products/${id}`)
    .set("Cookie", seller.cookie)
    .send(body as object);
}

function download(id: string) {
  return request(app)
    .get(`/api/products/${id}/image`)
    .buffer(true)
    .parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    });
}

describe("POST /api/products", () => {
  it("responde 401 sin sesión y no crea nada", async () => {
    const response = await request(app).post("/api/products").send(validBody());

    expect(response.status).toBe(401);
    expect(await Product.countDocuments()).toBe(0);
  });

  it("responde 201 con el producto público a nombre del usuario", async () => {
    const response = await publish(validBody());

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      name: "Polerón CC5003",
      description: "Polerón gris con el logo del curso.",
      category: "Poleras",
      price: 18000,
      image: expect.stringMatching(
        new RegExp(`^/api/products/${response.body.id}/image\\?v=\\d+$`),
      ),
      featured: false,
      seller: { id: ana.id, username: "anaperez", displayName: "Ana Pérez" },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toContain("data:");
    expect(JSON.stringify(response.body)).not.toContain("@dcc.uchile.cl");
  });

  it("guarda el data URL y lo sirve como binario", async () => {
    const bytes = makeImageBytes("image/webp", 300);
    const dataUrl = `data:image/webp;base64,${bytes.toString("base64")}`;

    const created = await publish(validBody({ image: dataUrl }));
    const stored = await Product.findById(created.body.id).lean();
    const image = await download(created.body.id);

    expect(stored?.image).toBe(dataUrl);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toBe("image/webp");
    expect(Buffer.from(image.body as Buffer).equals(bytes)).toBe(true);
  });

  it("toma el vendedor de la sesión y fuerza featured en false", async () => {
    const response = await publish(
      validBody({ seller: beto.id, featured: true, id: MISSING_ID }),
    );

    expect(response.status).toBe(201);
    const stored = await Product.findById(response.body.id).lean();
    expect(stored?.seller.toString()).toBe(ana.id);
    expect(stored?.featured).toBe(false);
    expect(response.body.id).not.toBe(MISSING_ID);
  });

  it("recorta espacios de nombre y descripción", async () => {
    const response = await publish(
      validBody({ name: "  Taza  ", description: "  Cerámica  " }),
    );

    expect(response.body).toMatchObject({
      name: "Taza",
      description: "Cerámica",
    });
  });

  it("responde 400 con errores por campo en español y no crea nada", async () => {
    const response = await publish({
      name: "",
      description: "x".repeat(1001),
      category: "Gorras",
      price: 1.5,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Revisa los datos ingresados.");
    expect(response.body.fieldErrors).toEqual({
      name: "El nombre es obligatorio.",
      description: "La descripción no puede superar los 1000 caracteres.",
      category: "Selecciona una categoría válida.",
      price: "El precio debe ser un número entero.",
      image: "La imagen es obligatoria.",
    });
    expect(await Product.countDocuments()).toBe(0);
  });

  it("responde 400 si no hay cuerpo", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Cookie", ana.cookie);

    expect(response.status).toBe(400);
    expect(await Product.countDocuments()).toBe(0);
  });

  it("rechaza una imagen con tipo inválido", async () => {
    const gif = `data:image/gif;base64,${Buffer.from("GIF89a....").toString("base64")}`;

    const response = await publish(validBody({ image: gif }));

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.image).toBe(
      "Formato de imagen no permitido. Usa JPG, PNG o WebP.",
    );
    expect(await Product.countDocuments()).toBe(0);
  });

  it("rechaza una imagen cuya firma no coincide con su tipo", async () => {
    const fake = `data:image/png;base64,${Buffer.from("<script>alert(1)</script>").toString("base64")}`;

    const response = await publish(validBody({ image: fake }));

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.image).toBe(
      "El archivo no es una imagen válida.",
    );
  });

  it("rechaza una imagen de más de 1 MB con 400 (el cuerpo cabe en 2 MB)", async () => {
    const tooBig = makeDataUrl("image/jpeg", MAX_IMAGE_BYTES + 1);

    const response = await publish(validBody({ image: tooBig }));

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.image).toBe(
      "La imagen no puede superar 1 MB.",
    );
    expect(await Product.countDocuments()).toBe(0);
  });

  it("acepta una imagen de exactamente 1 MB (cuerpo mayor a 100 KB)", async () => {
    const atLimit = makeDataUrl("image/jpeg", MAX_IMAGE_BYTES);

    const response = await publish(validBody({ image: atLimit }));

    expect(response.status).toBe(201);
    expect(await Product.countDocuments()).toBe(1);
  });

  it("responde 413 en español si el cuerpo supera 2 MB", async () => {
    const huge = `data:image/png;base64,${"A".repeat(3 * 1024 * 1024)}`;

    const response = await publish(validBody({ image: huge }));

    expect(response.status).toBe(413);
    expect(response.body.message).toBe(
      "Los datos enviados superan el tamaño máximo permitido.",
    );
    expect(await Product.countDocuments()).toBe(0);
  });
});

describe("límite de cuerpo del resto de la API", () => {
  it("sigue en 100 KB: login con 200 KB responde 413", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@dcc.uchile.cl", password: "x".repeat(200_000) });

    expect(response.status).toBe(413);
    expect(response.body.message).toBe(
      "Los datos enviados superan el tamaño máximo permitido.",
    );
  });

  it("sigue en 100 KB en rutas de usuarios", async () => {
    const response = await request(app)
      .post("/api/users/me/favorites")
      .set("Cookie", ana.cookie)
      .send({ productId: "x".repeat(200_000) });

    expect(response.status).toBe(413);
  });

  it("el límite de 2 MB no aplica a otros métodos de productos", async () => {
    const product = await createProduct(ana.id);

    const response = await request(app)
      .put(`/api/products/${product._id.toString()}`)
      .set("Cookie", ana.cookie)
      .send({ image: "A".repeat(200_000) });

    expect(response.status).toBe(413);
  });
});

describe("PATCH /api/products/:id", () => {
  it("responde 401 sin sesión", async () => {
    const product = await createProduct(ana.id);

    const response = await request(app)
      .patch(`/api/products/${product._id.toString()}`)
      .send({ price: 100 });

    expect(response.status).toBe(401);
  });

  it.each([
    ["inexistente", MISSING_ID],
    ["inválido", "taza-dcc"],
  ])("responde 404 para un id %s", async (_label, id) => {
    const response = await edit(id, { price: 100 });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Producto no encontrado.");
  });

  it("responde 403 a un no dueño y no modifica nada", async () => {
    const product = await createProduct(ana.id, { price: 6000 });

    const response = await edit(product._id.toString(), { price: 1 }, beto);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(NOT_OWNER);
    const stored = await Product.findById(product._id).lean();
    expect(stored?.price).toBe(6000);
  });

  it("evalúa el 403 antes de validar el cuerpo", async () => {
    const product = await createProduct(ana.id);

    const response = await edit(product._id.toString(), { price: -5 }, beto);

    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty("fieldErrors");
  });

  it("evalúa el 404 antes de validar el cuerpo", async () => {
    const response = await edit(MISSING_ID, {});

    expect(response.status).toBe(404);
  });

  it("responde 400 si no hay ningún campo reconocido", async () => {
    const product = await createProduct(ana.id);

    for (const body of [{}, { featured: true }, { seller: beto.id }]) {
      const response = await edit(product._id.toString(), body);
      expect(response.status).toBe(400);
      expect(response.body.fieldErrors.form).toBe("No hay cambios para guardar.");
    }
  });

  it("responde 400 por campo ante valores inválidos y no modifica", async () => {
    const product = await createProduct(ana.id, { name: "Original" });

    const response = await edit(product._id.toString(), {
      name: "",
      price: 0,
    });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.name).toBe("El nombre es obligatorio.");
    expect(response.body.fieldErrors.price).toBe(
      "El precio debe ser mayor a cero.",
    );
    expect((await Product.findById(product._id).lean())?.name).toBe("Original");
  });

  it("rechaza una imagen inválida en la edición", async () => {
    const product = await createProduct(ana.id);

    const response = await edit(product._id.toString(), {
      image: makeDataUrl("image/jpeg", MAX_IMAGE_BYTES + 1),
    });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.image).toBe(
      "La imagen no puede superar 1 MB.",
    );
  });

  it("actualiza solo los campos enviados y conserva la imagen", async () => {
    const original = makeDataUrl("image/png", 100);
    const product = await createProduct(ana.id, {
      name: "Taza",
      price: 6000,
      image: original,
    });
    const before = await request(app).get(
      `/api/products/${product._id.toString()}`,
    );

    const response = await edit(product._id.toString(), {
      price: 7500,
      description: "Nueva descripción",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: product._id.toString(),
      name: "Taza",
      price: 7500,
      description: "Nueva descripción",
      seller: { id: ana.id },
    });
    const stored = await Product.findById(product._id).lean();
    expect(stored?.image).toBe(original);
    expect(JSON.stringify(response.body)).not.toContain("data:");
    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before.body.updatedAt).getTime(),
    );
  });

  it("reemplaza la imagen y cambia la URL pública versionada", async () => {
    const product = await createProduct(ana.id, {
      image: makeDataUrl("image/png", 100),
    });
    const before = await request(app).get(
      `/api/products/${product._id.toString()}`,
    );
    const newBytes = makeImageBytes("image/jpeg", 250);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const response = await edit(product._id.toString(), {
      image: `data:image/jpeg;base64,${newBytes.toString("base64")}`,
    });

    expect(response.status).toBe(200);
    expect(response.body.image).not.toBe(before.body.image);
    const image = await download(product._id.toString());
    expect(image.headers["content-type"]).toBe("image/jpeg");
    expect(Buffer.from(image.body as Buffer).equals(newBytes)).toBe(true);
  });

  it("ignora featured, seller e id", async () => {
    const product = await createProduct(ana.id, { featured: false });

    const response = await edit(product._id.toString(), {
      price: 9000,
      featured: true,
      seller: beto.id,
      id: MISSING_ID,
    });

    expect(response.status).toBe(200);
    const stored = await Product.findById(product._id).lean();
    expect(stored?.featured).toBe(false);
    expect(stored?.seller.toString()).toBe(ana.id);
    expect(response.body.id).toBe(product._id.toString());
  });

  it("responde 413 si el cuerpo supera 2 MB", async () => {
    const product = await createProduct(ana.id);

    const response = await edit(product._id.toString(), {
      image: `data:image/png;base64,${"A".repeat(3 * 1024 * 1024)}`,
    });

    expect(response.status).toBe(413);
  });
});

describe("DELETE /api/products/:id", () => {
  it("responde 401 sin sesión", async () => {
    const product = await createProduct(ana.id);

    const response = await request(app).delete(
      `/api/products/${product._id.toString()}`,
    );

    expect(response.status).toBe(401);
    expect(await Product.countDocuments()).toBe(1);
  });

  it.each([
    ["inexistente", MISSING_ID],
    ["inválido", "taza-dcc"],
  ])("responde 404 para un id %s", async (_label, id) => {
    const response = await request(app)
      .delete(`/api/products/${id}`)
      .set("Cookie", ana.cookie);

    expect(response.status).toBe(404);
  });

  it("responde 403 a un no dueño y no borra", async () => {
    const product = await createProduct(ana.id);

    const response = await request(app)
      .delete(`/api/products/${product._id.toString()}`)
      .set("Cookie", beto.cookie);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(NOT_OWNER);
    expect(await Product.countDocuments()).toBe(1);
  });

  it("responde 204 y elimina el producto", async () => {
    const product = await createProduct(ana.id);
    const other = await createProduct(ana.id);

    const response = await request(app)
      .delete(`/api/products/${product._id.toString()}`)
      .set("Cookie", ana.cookie);

    expect(response.status).toBe(204);
    expect(await Product.findById(product._id)).toBeNull();
    expect(await Product.findById(other._id)).not.toBeNull();
    const again = await request(app).get(
      `/api/products/${product._id.toString()}`,
    );
    expect(again.status).toBe(404);
  });

  it("quita el id de favoritos, historial y carrito de todos los usuarios", async () => {
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
    const carla = await User.create({
      username: "carla",
      displayName: "Carla",
      email: "carla@dcc.uchile.cl",
      passwordHash: "hash",
      favorites: [keptId],
    });

    const response = await request(app)
      .delete(`/api/products/${doomedId}`)
      .set("Cookie", ana.cookie);

    expect(response.status).toBe(204);
    for (const userId of [ana.id, beto.id]) {
      const user = await User.findById(userId).lean();
      expect(user?.favorites).toEqual([keptId]);
      expect(user?.history.map((visit) => visit.productId)).toEqual([keptId]);
      expect(user?.cart).toEqual([
        expect.objectContaining({ productId: keptId, quantity: 1 }),
      ]);
    }
    const untouched = await User.findById(carla._id).lean();
    expect(untouched?.favorites).toEqual([keptId]);
    expect(untouched?.history).toEqual([]);
    expect(untouched?.cart).toEqual([]);
  });

  it("mantiene el borrado aunque falle la limpieza de referencias", async () => {
    const product = await createProduct(ana.id);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(User, "updateMany").mockRejectedValueOnce(new Error("caída"));

    const response = await request(app)
      .delete(`/api/products/${product._id.toString()}`)
      .set("Cookie", ana.cookie);

    expect(response.status).toBe(204);
    expect(await Product.findById(product._id)).toBeNull();
  });
});
