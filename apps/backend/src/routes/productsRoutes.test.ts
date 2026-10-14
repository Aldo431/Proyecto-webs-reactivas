import type { Express } from "express";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { Product } from "../models/Product.ts";
import { User } from "../models/User.ts";
import {
  createProduct,
  createSeller,
  makeDataUrl,
  makeImageBytes,
  type TestSeller,
} from "../test/productFixtures.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";

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

function ids(body: { id: string }[]): string[] {
  return body.map((product) => product.id);
}

function pageIds(body: { products: { id: string }[] }): string[] {
  return ids(body.products);
}

describe("GET /api/products", () => {
  it("responde 200 con una lista vacía si no hay productos", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("devuelve el contrato público sin correo del vendedor", async () => {
    const product = await createProduct(ana.id, {
      name: "Taza DCC",
      featured: true,
    });

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: product._id.toString(),
        name: "Taza DCC",
        description: "Descripción de prueba.",
        category: "Tazas",
        price: 6000,
        image: "/images/taza-dcc.png",
        featured: true,
        seller: {
          id: ana.id,
          username: "anaperez",
          displayName: "Ana Pérez",
        },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ]);
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("@dcc.uchile.cl");
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("__v");
  });

  it("ordena del más reciente al más antiguo", async () => {
    const oldest = await createProduct(ana.id, {
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const newest = await createProduct(beto.id, {
      createdAt: new Date("2026-03-01T00:00:00Z"),
    });
    const middle = await createProduct(ana.id, {
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });

    const response = await request(app).get("/api/products");

    expect(ids(response.body)).toEqual([
      newest._id.toString(),
      middle._id.toString(),
      oldest._id.toString(),
    ]);
  });

  it("nunca devuelve el data URL: lo reemplaza por la ruta versionada", async () => {
    const uploaded = await createProduct(ana.id, {
      image: makeDataUrl("image/webp", 5000),
    });
    const seeded = await createProduct(ana.id, {
      image: "/images/polera-dcc.png",
    });

    const response = await request(app).get("/api/products");

    const byId = new Map(
      (response.body as { id: string; image: string }[]).map((product) => [
        product.id,
        product.image,
      ]),
    );
    expect(byId.get(uploaded._id.toString())).toBe(
      `/api/products/${uploaded._id.toString()}/image?v=${uploaded.updatedAt.getTime()}`,
    );
    expect(byId.get(seeded._id.toString())).toBe("/images/polera-dcc.png");
    expect(JSON.stringify(response.body)).not.toContain("base64");
    expect(JSON.stringify(response.body)).not.toContain("data:");
  });

  it("filtra por categoría", async () => {
    const taza = await createProduct(ana.id, { category: "Tazas" });
    await createProduct(ana.id, { category: "Poleras" });

    const response = await request(app).get("/api/products?categoria=Tazas");

    expect(ids(response.body)).toEqual([taza._id.toString()]);
  });

  it("responde 400 en español ante una categoría desconocida", async () => {
    const response = await request(app).get("/api/products?categoria=Gorras");

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.categoria).toBe(
      "Selecciona una categoría válida.",
    );
  });

  it("filtra destacados y no destacados", async () => {
    const featured = await createProduct(ana.id, { featured: true });
    const regular = await createProduct(ana.id, { featured: false });

    const yes = await request(app).get("/api/products?featured=true");
    const no = await request(app).get("/api/products?featured=false");

    expect(ids(yes.body)).toEqual([featured._id.toString()]);
    expect(ids(no.body)).toEqual([regular._id.toString()]);
  });

  it("responde 400 ante un valor inválido de featured", async () => {
    const response = await request(app).get("/api/products?featured=quizas");

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toHaveProperty("featured");
  });

  it("filtra por ids conservando el orden pedido", async () => {
    const first = await createProduct(ana.id);
    const second = await createProduct(ana.id);
    const third = await createProduct(beto.id);
    const [a, b, c] = [first, second, third].map((p) => p._id.toString());

    const response = await request(app).get(`/api/products?ids=${c},${a}`);

    expect(ids(response.body)).toEqual([c, a]);
    expect(ids(response.body)).not.toContain(b);
  });

  it("omite ids inválidos, inexistentes y repetidos sin error", async () => {
    const product = await createProduct(ana.id);
    const id = product._id.toString();
    const missing = "6713b0c2a1f4e9d2c8b70a99";

    const response = await request(app).get(
      `/api/products?ids=taza-dcc,${missing},${id},${id},abcdefghijkl`,
    );

    expect(response.status).toBe(200);
    expect(ids(response.body)).toEqual([id]);
  });

  it("devuelve [] con ids vacío o sin ids válidos", async () => {
    await createProduct(ana.id);

    const empty = await request(app).get("/api/products?ids=");
    const invalid = await request(app).get("/api/products?ids=taza-dcc");

    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);
    expect(invalid.body).toEqual([]);
  });

  it("responde 400 con más de 100 ids", async () => {
    const many = Array.from({ length: 101 }, (_, index) => `id${index}`).join(
      ",",
    );

    const response = await request(app).get(`/api/products?ids=${many}`);

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toHaveProperty("ids");
  });

  it("combina los filtros con AND", async () => {
    const match = await createProduct(ana.id, {
      category: "Poleras",
      featured: true,
    });
    const otherCategory = await createProduct(ana.id, {
      category: "Tazas",
      featured: true,
    });
    const notFeatured = await createProduct(ana.id, {
      category: "Poleras",
      featured: false,
    });
    const all = [match, otherCategory, notFeatured]
      .map((product) => product._id.toString())
      .join(",");

    const response = await request(app).get(
      `/api/products?categoria=Poleras&featured=true&ids=${all}`,
    );

    expect(ids(response.body)).toEqual([match._id.toString()]);
  });
});

describe("GET /api/products (búsqueda, orden y precio)", () => {
  it("filtra por subcadena del nombre insensible a mayúsculas", async () => {
    const taza = await createProduct(ana.id, { name: "Taza DCC" });
    await createProduct(ana.id, { name: "Polera DCC" });

    for (const q of ["taza", "TAZA", "Taz"]) {
      const response = await request(app).get(
        `/api/products?q=${encodeURIComponent(q)}`,
      );

      expect(response.status).toBe(200);
      expect(pageIds(response.body)).toEqual([taza._id.toString()]);
    }
  });

  it("ignora las tildes al buscar", async () => {
    const tazon = await createProduct(ana.id, { name: "Tazón Andino" });
    await createProduct(ana.id, { name: "Polera DCC" });

    const response = await request(app).get("/api/products?q=tazon");

    expect(response.status).toBe(200);
    expect(pageIds(response.body)).toEqual([tazon._id.toString()]);
  });

  it("trata los caracteres especiales como literales sin fallar", async () => {
    await createProduct(ana.id, { name: "Taza DCC" });

    const response = await request(app).get(
      `/api/products?q=${encodeURIComponent("(taza)+")}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.products).toEqual([]);
    expect(response.body.total).toBe(0);
  });

  it("ordena por precio menor y mayor", async () => {
    const cheap = await createProduct(ana.id, {
      name: "Barato",
      price: 1500,
    });
    const mid = await createProduct(ana.id, { name: "Medio", price: 6000 });
    const expensive = await createProduct(ana.id, {
      name: "Caro",
      price: 12000,
    });

    const ascending = await request(app).get(
      "/api/products?orden=precio-menor",
    );
    const descending = await request(app).get(
      "/api/products?orden=precio-mayor",
    );

    expect(ascending.status).toBe(200);
    expect(pageIds(ascending.body)).toEqual([
      cheap._id.toString(),
      mid._id.toString(),
      expensive._id.toString(),
    ]);
    expect(descending.status).toBe(200);
    expect(pageIds(descending.body)).toEqual([
      expensive._id.toString(),
      mid._id.toString(),
      cheap._id.toString(),
    ]);
  });

  it("ordena por nombre de la A a la Z", async () => {
    const beta = await createProduct(ana.id, { name: "Beta" });
    const alfa = await createProduct(ana.id, { name: "alfa" });
    const zeta = await createProduct(ana.id, { name: "Zeta" });

    const response = await request(app).get("/api/products?orden=nombre");

    expect(response.status).toBe(200);
    expect(pageIds(response.body)).toEqual([
      alfa._id.toString(),
      beta._id.toString(),
      zeta._id.toString(),
    ]);
  });

  it("acota por precio mínimo y máximo combinados", async () => {
    await createProduct(ana.id, { name: "Barato", price: 1500 });
    const mid = await createProduct(ana.id, { name: "Medio", price: 6000 });
    await createProduct(ana.id, { name: "Caro", price: 12000 });

    const response = await request(app).get(
      "/api/products?min=5000&max=9000",
    );

    expect(response.status).toBe(200);
    expect(pageIds(response.body)).toEqual([mid._id.toString()]);
  });

  it("responde 400 con min mayor que max y con orden inválido", async () => {
    const flipped = await request(app).get("/api/products?min=9000&max=5000");
    const badSort = await request(app).get("/api/products?orden=raro");

    expect(flipped.status).toBe(400);
    expect(badSort.status).toBe(400);
  });
});

describe("GET /api/products (paginación)", () => {
  async function seedCatalog(count: number) {
    const created = [];
    for (let index = 0; index < count; index += 1) {
      created.push(
        await createProduct(ana.id, {
          name: `Producto ${index}`,
          price: 1000 + index,
        }),
      );
    }
    return created;
  }

  it("devuelve la primera página con totales en un objeto", async () => {
    await seedCatalog(10);

    const response = await request(app).get("/api/products?pagina=1");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(10);
    expect(response.body.pagina).toBe(1);
    expect(response.body.porPagina).toBe(9);
    expect(response.body.totalPaginas).toBe(2);
    expect(response.body.products).toHaveLength(9);
  });

  it("devuelve la segunda página con el resto", async () => {
    await seedCatalog(10);

    const response = await request(app).get("/api/products?pagina=2");

    expect(response.status).toBe(200);
    expect(response.body.pagina).toBe(2);
    expect(response.body.totalPaginas).toBe(2);
    expect(response.body.products).toHaveLength(1);
  });

  it("ajusta la página excedida a la última con resultados", async () => {
    await seedCatalog(10);

    const response = await request(app).get("/api/products?pagina=999");

    expect(response.status).toBe(200);
    expect(response.body.pagina).toBe(2);
    expect(response.body.products).toHaveLength(1);
  });

  it("responde 400 con página inválida", async () => {
    await seedCatalog(1);

    const response = await request(app).get("/api/products?pagina=0");

    expect(response.status).toBe(400);
  });

  it("responde el objeto paginado con cualquier clave nueva", async () => {
    await createProduct(ana.id, { name: "Taza DCC" });

    const response = await request(app).get("/api/products?q=taza");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.products).toHaveLength(1);
  });

  it("mantiene el arreglo simple sin claves nuevas", async () => {
    await createProduct(ana.id, { name: "Taza DCC", category: "Tazas" });
    await createProduct(ana.id, { name: "Polera DCC", category: "Poleras" });

    const plain = await request(app).get("/api/products");
    const filtered = await request(app).get("/api/products?categoria=Tazas");

    expect(Array.isArray(plain.body)).toBe(true);
    expect(plain.body).toHaveLength(2);
    expect(Array.isArray(filtered.body)).toBe(true);
    expect(filtered.body).toHaveLength(1);
  });
});

describe("GET /api/products/mine", () => {
  it("responde 401 sin sesión", async () => {
    const response = await request(app).get("/api/products/mine");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Debes iniciar sesión.");
  });

  it("devuelve solo los productos del usuario, del más reciente al más antiguo", async () => {
    const old = await createProduct(ana.id, {
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const recent = await createProduct(ana.id, {
      createdAt: new Date("2026-02-01T00:00:00Z"),
      image: makeDataUrl(),
    });
    await createProduct(beto.id);

    const response = await request(app)
      .get("/api/products/mine")
      .set("Cookie", ana.cookie);

    expect(response.status).toBe(200);
    expect(ids(response.body)).toEqual([
      recent._id.toString(),
      old._id.toString(),
    ]);
    expect(JSON.stringify(response.body)).not.toContain("data:");
  });

  it("responde [] si no tiene publicaciones", async () => {
    await createProduct(ana.id);

    const response = await request(app)
      .get("/api/products/mine")
      .set("Cookie", beto.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("GET /api/products/:id", () => {
  it("responde 200 con el producto público", async () => {
    const product = await createProduct(ana.id, { name: "Sticker" });

    const response = await request(app).get(
      `/api/products/${product._id.toString()}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: product._id.toString(),
      name: "Sticker",
      seller: { id: ana.id, username: "anaperez", displayName: "Ana Pérez" },
    });
    expect(response.body.seller).not.toHaveProperty("email");
  });

  it("devuelve la ruta versionada, no el data URL", async () => {
    const product = await createProduct(ana.id, { image: makeDataUrl() });

    const response = await request(app).get(
      `/api/products/${product._id.toString()}`,
    );

    expect(response.body.image).toBe(
      `/api/products/${product._id.toString()}/image?v=${product.updatedAt.getTime()}`,
    );
  });

  it.each([
    ["inexistente", "6713b0c2a1f4e9d2c8b70a99"],
    ["id antiguo", "taza-dcc"],
    ["12 caracteres", "abcdefghijkl"],
  ])("responde 404 en español para un id %s", async (_label, id) => {
    const response = await request(app).get(`/api/products/${id}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Producto no encontrado.");
  });
});

describe("GET /api/products/:id/image", () => {
  it("sirve el binario con tipo, caché inmutable y nosniff", async () => {
    const bytes = makeImageBytes("image/webp", 200);
    const product = await createProduct(ana.id, {
      image: `data:image/webp;base64,${bytes.toString("base64")}`,
    });

    const response = await request(app)
      .get(`/api/products/${product._id.toString()}/image`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("image/webp");
    expect(response.headers["cache-control"]).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(Buffer.from(response.body as Buffer).equals(bytes)).toBe(true);
  });

  it("redirige con 302 si la imagen es una ruta del seed", async () => {
    const product = await createProduct(ana.id, {
      image: "/images/taza-dcc.png",
    });

    const response = await request(app)
      .get(`/api/products/${product._id.toString()}/image`)
      .redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/images/taza-dcc.png");
  });

  it.each([
    ["inexistente", "6713b0c2a1f4e9d2c8b70a99"],
    ["inválido", "taza-dcc"],
  ])("responde 404 para un id %s", async (_label, id) => {
    const response = await request(app).get(`/api/products/${id}/image`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Producto no encontrado.");
  });
});
