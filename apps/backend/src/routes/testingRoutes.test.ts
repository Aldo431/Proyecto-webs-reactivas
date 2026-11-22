import type { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.ts";
import { resetEnvCacheForTests } from "../config/env.ts";
import { Product } from "../models/Product.ts";
import { User } from "../models/User.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import { createProduct, createSeller } from "../test/productFixtures.ts";

let mongo: MongoMemoryReplSet;

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCacheForTests();
});

describe("POST /api/testing/reset (spec 016, RF-3)", () => {
  it("vacía usuarios y productos y responde 204 en modo test", async () => {
    const app = createApp();
    const seller = await createSeller(app, "anaperez", "Ana Pérez");
    await createProduct(seller.id);
    expect(await User.countDocuments()).toBe(1);
    expect(await Product.countDocuments()).toBe(1);

    const response = await request(app).post("/api/testing/reset");

    expect(response.status).toBe(204);
    expect(await User.countDocuments()).toBe(0);
    expect(await Product.countDocuments()).toBe(0);
  });

  it("no existe fuera de NODE_ENV=test", async () => {
    vi.stubEnv("NODE_ENV", "development");
    resetEnvCacheForTests();
    const app = createApp();

    const response = await request(app).post("/api/testing/reset");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Ruta no encontrada." });
  });
});
