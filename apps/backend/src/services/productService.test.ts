import type { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Product } from "../models/Product.ts";
import { User } from "../models/User.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import { createProduct, makeDataUrl } from "../test/productFixtures.ts";
import { isObjectIdString, READ_PROJECTION } from "./productService.ts";

let mongo: MongoMemoryServer;
let sellerId: string;

beforeAll(async () => {
  mongo = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await Product.deleteMany({});
  await User.deleteMany({});
  const seller = await User.create({
    username: "anaperez",
    displayName: "Ana Pérez",
    email: "ana@dcc.uchile.cl",
    passwordHash: "hash",
  });
  sellerId = seller._id.toString();
});

describe("READ_PROJECTION", () => {
  it("trae solo el marcador del data URL y las rutas completas", async () => {
    const uploaded = await createProduct(sellerId, {
      image: makeDataUrl("image/png", 20_000),
    });
    const seeded = await createProduct(sellerId, {
      image: "/images/taza-dcc.png",
    });

    const rows = await Product.find({}, READ_PROJECTION).lean();
    const images = new Map(rows.map((row) => [row._id.toString(), row.image]));

    expect(images.get(uploaded._id.toString())).toBe("data:");
    expect(images.get(seeded._id.toString())).toBe("/images/taza-dcc.png");
  });

  it("conserva el resto de los campos del producto", async () => {
    await createProduct(sellerId, { name: "Taza", price: 6000 });

    const [row] = await Product.find({}, READ_PROJECTION).lean();

    expect(row).toMatchObject({
      name: "Taza",
      price: 6000,
      category: "Tazas",
      featured: false,
    });
    expect(row?.seller.toString()).toBe(sellerId);
    expect(row?.createdAt).toBeInstanceOf(Date);
  });
});

describe("isObjectIdString", () => {
  it("acepta 24 caracteres hexadecimales y rechaza el resto", () => {
    expect(isObjectIdString("6713b0c2a1f4e9d2c8b70a11")).toBe(true);
    expect(isObjectIdString("6713B0C2A1F4E9D2C8B70A11")).toBe(true);
    expect(isObjectIdString("abcdefghijkl")).toBe(false);
    expect(isObjectIdString("taza-dcc")).toBe(false);
    expect(isObjectIdString("")).toBe(false);
    expect(isObjectIdString("6713b0c2a1f4e9d2c8b70a1")).toBe(false);
  });
});
