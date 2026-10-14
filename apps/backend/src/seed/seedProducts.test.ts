import { readFileSync } from "node:fs";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Product } from "../models/Product.ts";
import { listProducts } from "../services/productService.ts";
import { User } from "../models/User.ts";
import { verifyPassword } from "../services/authService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import {
  parseSeedProducts,
  remapReferences,
  SEED_SELLER,
  seedProducts,
  type SeedProduct,
} from "./seedProducts.ts";

const PASSWORD = "clave-de-prueba-123";

function loadSeedCatalog(): SeedProduct[] {
  const raw: unknown = JSON.parse(
    readFileSync(new URL("./products.json", import.meta.url), "utf-8"),
  );
  return parseSeedProducts(raw);
}

let mongo: MongoMemoryServer;
let catalog: SeedProduct[];

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
  await Product.syncIndexes();
  catalog = loadSeedCatalog();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await Product.deleteMany({});
  await User.deleteMany({});
});

function run(products: SeedProduct[] = catalog) {
  return seedProducts({ products, sellerPassword: PASSWORD });
}

async function idOf(name: string): Promise<string> {
  const product = await Product.findOne({ name }).lean();
  if (!product) {
    throw new Error(`Falta el producto ${name}`);
  }
  return product._id.toString();
}

describe("parseSeedProducts", () => {
  it("acepta el catálogo de products.json", () => {
    expect(catalog.map((product) => product.id)).toEqual([
      "taza-dcc",
      "polera-dcc",
      "sticker-dcc",
      "pin-cadcc",
      "polera-sushi-cats",
      "polera-meme",
      "pin-dcc-2",
      "taza-2",
      "taza-3",
    ]);
    expect(catalog.every((product) => product.image.startsWith("/images/"))).toBe(
      true,
    );
  });

  it("rechaza productos inválidos, ids o nombres repetidos", () => {
    const [first] = catalog;
    if (!first) {
      throw new Error("Catálogo vacío.");
    }
    expect(() => parseSeedProducts({ products: [{ ...first, price: 0 }] })).toThrow();
    expect(() =>
      parseSeedProducts({ products: [{ ...first, category: "Gorras" }] }),
    ).toThrow();
    expect(() => parseSeedProducts({ products: [first, first] })).toThrow();
    expect(() => parseSeedProducts({})).toThrow();
  });
});

describe("remapReferences", () => {
  const idMap = new Map([
    ["taza-dcc", "n1"],
    ["polera-dcc", "n2"],
  ]);

  it("reemplaza los ids antiguos y conserva las demás referencias", () => {
    const viewedAt = new Date("2026-10-13T10:00:00Z");

    const result = remapReferences(
      {
        favorites: ["taza-dcc", "otro", "n9"],
        history: [
          { productId: "polera-dcc", viewedAt },
          { productId: "otro", viewedAt },
        ],
        cart: [
          { productId: "taza-dcc", quantity: 2 },
          { productId: "otro", quantity: 1 },
        ],
      },
      idMap,
    );

    expect(result.favorites).toEqual(["n1", "otro", "n9"]);
    expect(result.history).toEqual([
      { productId: "n2", viewedAt },
      { productId: "otro", viewedAt },
    ]);
    expect(result.cart).toEqual([
      { productId: "n1", quantity: 2 },
      { productId: "otro", quantity: 1 },
    ]);
  });

  it("evita duplicados: favoritos e historial conservan el primero, el carrito suma", () => {
    const viewedAt = new Date("2026-10-13T10:00:00Z");

    const result = remapReferences(
      {
        favorites: ["taza-dcc", "n1"],
        history: [
          { productId: "n1", viewedAt },
          { productId: "taza-dcc", viewedAt: new Date(0) },
        ],
        cart: [
          { productId: "taza-dcc", quantity: 2 },
          { productId: "n1", quantity: 3 },
        ],
      },
      idMap,
    );

    expect(result.favorites).toEqual(["n1"]);
    expect(result.history).toEqual([{ productId: "n1", viewedAt }]);
    expect(result.cart).toEqual([{ productId: "n1", quantity: 5 }]);
  });
});

describe("seedProducts", () => {
  it("crea el vendedor de prueba con la contraseña hasheada", async () => {
    const summary = await run();

    expect(summary.sellerCreated).toBe(true);
    const seller = await User.findOne({ email: SEED_SELLER.email });
    expect(seller).toMatchObject({
      username: "tiendadcc",
      displayName: "TiendaDCC",
      email: "vendedor@tiendadcc.cl",
    });
    expect(seller?.passwordHash).not.toBe(PASSWORD);
    expect(await verifyPassword(PASSWORD, seller?.passwordHash ?? "")).toBe(true);
  });

  it("crea los productos del JSON con el vendedor y sus imágenes actuales", async () => {
    const summary = await run();

    expect(summary).toMatchObject({
      created: catalog.length,
      updated: 0,
      usersRemapped: 0,
    });
    const seller = await User.findOne({ email: SEED_SELLER.email }).lean();
    const stored = await Product.find({}).sort({ name: 1 }).lean();
    expect(stored).toHaveLength(catalog.length);
    for (const product of stored) {
      expect(product.seller.toString()).toBe(seller?._id.toString());
      const source = catalog.find((entry) => entry.name === product.name);
      expect(product).toMatchObject({
        description: source?.description,
        category: source?.category,
        price: source?.price,
        image: source?.image,
        featured: source?.featured,
      });
    }
  });

  it("deja los productos en el orden del JSON al listar del más reciente al más antiguo", async () => {
    await run();

    const all = await listProducts({ orden: "recientes", pagina: 1 });
    const featured = await listProducts({
      featured: true,
      orden: "recientes",
      pagina: 1,
    });

    const jsonOrder = catalog.map((product) => product.name);
    expect(jsonOrder).toEqual([
      "Taza DCC",
      "Polera DCC",
      "Sticker DCC",
      "Pin cadcc",
      "Polera sushi cats",
      "Polera meme",
      "Pin dcc",
      "Taza dcc",
      "Taza cadcc",
    ]);
    expect(all.map((product) => product.name)).toEqual(jsonOrder);
    expect(featured.map((product) => product.name)).toEqual(
      catalog.filter((product) => product.featured).map((product) => product.name),
    );
  });

  it("mantiene ese orden al ejecutarlo de nuevo", async () => {
    await run();
    await run();

    const all = await listProducts({ orden: "recientes", pagina: 1 });

    expect(all.map((product) => product.name)).toEqual(
      catalog.map((product) => product.name),
    );
  });

  it("no duplica vendedor ni productos al ejecutarse dos veces", async () => {
    await run();
    const firstIds = (await Product.find({}).sort({ name: 1 }).lean()).map(
      (product) => product._id.toString(),
    );
    const sellerHash = (await User.findOne({ email: SEED_SELLER.email }))
      ?.passwordHash;

    const second = await run();
    const third = await seedProducts({
      products: catalog,
      sellerPassword: "otra-clave-distinta-9",
    });

    expect(second).toMatchObject({
      sellerCreated: false,
      created: 0,
      updated: catalog.length,
      usersRemapped: 0,
    });
    expect(third.sellerCreated).toBe(false);
    expect(await Product.countDocuments()).toBe(catalog.length);
    expect(await User.countDocuments()).toBe(1);
    const secondIds = (await Product.find({}).sort({ name: 1 }).lean()).map(
      (product) => product._id.toString(),
    );
    expect(secondIds).toEqual(firstIds);
    // Reutilizar el vendedor no cambia su contraseña.
    expect((await User.findOne({ email: SEED_SELLER.email }))?.passwordHash).toBe(
      sellerHash,
    );
  });

  it("restablece los datos de un producto del seed modificado", async () => {
    await run();
    await Product.updateOne({ name: "Taza DCC" }, { price: 1, featured: false });

    await run();

    const taza = await Product.findOne({ name: "Taza DCC" }).lean();
    const source = catalog.find((entry) => entry.name === "Taza DCC");
    expect(taza?.price).toBe(source?.price);
    expect(taza?.featured).toBe(source?.featured);
  });

  it("no toca los productos de otros vendedores con el mismo nombre", async () => {
    const other = await User.create({
      username: "anaperez",
      displayName: "Ana",
      email: "ana@dcc.uchile.cl",
      passwordHash: "hash",
    });
    await Product.create({
      name: "Taza DCC",
      description: "Mi taza",
      category: "Tazas",
      price: 9999,
      image: "/images/mia.png",
      seller: other._id,
    });

    await run();

    expect(await Product.countDocuments()).toBe(catalog.length + 1);
    const mine = await Product.findOne({ seller: other._id }).lean();
    expect(mine).toMatchObject({ price: 9999, image: "/images/mia.png" });
  });

  it("reemplaza los ids antiguos en favoritos, historial y carrito", async () => {
    const viewedAt = new Date("2026-10-13T10:00:00Z");
    const user = await User.create({
      username: "anaperez",
      displayName: "Ana",
      email: "ana@dcc.uchile.cl",
      passwordHash: "hash",
      favorites: ["taza-dcc", "6713b0c2a1f4e9d2c8b70a99", "sticker-dcc"],
      history: [
        { productId: "polera-dcc", viewedAt },
        { productId: "6713b0c2a1f4e9d2c8b70a99", viewedAt },
      ],
      cart: [
        { productId: "taza-dcc", quantity: 2 },
        { productId: "6713b0c2a1f4e9d2c8b70a99", quantity: 4 },
      ],
    });

    const summary = await run();

    const taza = await idOf("Taza DCC");
    const polera = await idOf("Polera DCC");
    const sticker = await idOf("Sticker DCC");
    expect(summary.usersRemapped).toBe(1);
    const updated = await User.findById(user._id).lean();
    expect(updated?.favorites).toEqual([
      taza,
      "6713b0c2a1f4e9d2c8b70a99",
      sticker,
    ]);
    expect(updated?.history.map((visit) => visit.productId)).toEqual([
      polera,
      "6713b0c2a1f4e9d2c8b70a99",
    ]);
    expect(updated?.history[0]?.viewedAt).toEqual(viewedAt);
    expect(
      updated?.cart.map((line) => [line.productId, line.quantity]),
    ).toEqual([
      [taza, 2],
      ["6713b0c2a1f4e9d2c8b70a99", 4],
    ]);
  });

  it("no modifica a los usuarios sin referencias antiguas", async () => {
    const clean = await User.create({
      username: "betoruiz",
      displayName: "Beto",
      email: "beto@dcc.uchile.cl",
      passwordHash: "hash",
      favorites: ["6713b0c2a1f4e9d2c8b70a99"],
      cart: [{ productId: "6713b0c2a1f4e9d2c8b70a99", quantity: 1 }],
    });
    const before = await User.findById(clean._id).lean();

    const summary = await run();

    expect(summary.usersRemapped).toBe(0);
    expect(await User.findById(clean._id).lean()).toEqual(before);
  });

  it("no vuelve a remapear en una segunda ejecución", async () => {
    await User.create({
      username: "anaperez",
      displayName: "Ana",
      email: "ana@dcc.uchile.cl",
      passwordHash: "hash",
      favorites: ["taza-dcc"],
    });

    const first = await run();
    const afterFirst = await User.findOne({ username: "anaperez" }).lean();
    const second = await run();
    const afterSecond = await User.findOne({ username: "anaperez" }).lean();

    expect(first.usersRemapped).toBe(1);
    expect(second.usersRemapped).toBe(0);
    expect(afterSecond).toEqual(afterFirst);
  });

  it("falla sin escribir productos si el username del vendedor es de otra cuenta", async () => {
    await User.create({
      username: SEED_SELLER.username,
      displayName: "Otra persona",
      email: "otra@dcc.uchile.cl",
      passwordHash: "hash",
    });

    await expect(run()).rejects.toThrow(/ya pertenece a otra cuenta/);
    expect(await Product.countDocuments()).toBe(0);
  });
});
