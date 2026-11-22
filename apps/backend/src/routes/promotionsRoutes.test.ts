import type { Express } from "express";
import type { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { Promotion } from "../models/Promotion.ts";
import { User } from "../models/User.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import { createSeller, type TestSeller } from "../test/productFixtures.ts";

let mongo: MongoMemoryReplSet;
let app: Express;
let admin: TestSeller;
let buyer: TestSeller;

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
  await Promotion.syncIndexes();
  app = createApp();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await Promotion.deleteMany({});
  await User.deleteMany({});
  admin = await createSeller(app, "adminpromo", "Admin Promo");
  await User.findByIdAndUpdate(admin.id, { role: "admin" });
  buyer = await createSeller(app, "compradorpromo", "Comprador Promo");
});

function create(body: unknown, cookie: string | null = admin.cookie) {
  const call = request(app).post("/api/promotions");
  if (cookie) call.set("Cookie", cookie);
  return call.send(body as object);
}

describe("GET /api/promotions", () => {
  it("lista solo las promociones vigentes sin exigir sesión", async () => {
    await Promotion.create([
      { type: "studentDiscount", label: "20% alumnos", active: true, percent: 20 },
      { type: "quantityPack3x2", label: "3x2", active: false },
      {
        type: "quantityPack2x15",
        label: "Fuera de vigencia",
        active: true,
        percent: 15,
        endsAt: new Date("2020-01-01"),
      },
    ]);

    const response = await request(app).get("/api/promotions");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      type: "studentDiscount",
      label: "20% alumnos",
      active: true,
    });
    expect(response.body[0]).not.toHaveProperty("__v");
  });
});

describe("POST /api/promotions", () => {
  it("crea una promoción como administrador", async () => {
    const response = await create({
      type: "quantityPack3x2",
      label: "Pack 3x2",
      active: true,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      type: "quantityPack3x2",
      label: "Pack 3x2",
      active: true,
    });
    expect(await Promotion.countDocuments()).toBe(1);
  });

  it("rechaza datos inválidos con 400", async () => {
    const response = await create({
      type: "studentDiscount",
      label: "Descuento",
      active: true,
      percent: 150,
    });

    expect(response.status).toBe(400);
    expect(await Promotion.countDocuments()).toBe(0);
  });

  it("rechaza a un usuario sin rol de administrador con 403", async () => {
    const response = await create(
      { type: "quantityPack3x2", label: "Pack 3x2", active: true },
      buyer.cookie,
    );

    expect(response.status).toBe(403);
    expect(await Promotion.countDocuments()).toBe(0);
  });

  it("rechaza a un anónimo con 401", async () => {
    const response = await create(
      { type: "quantityPack3x2", label: "Pack 3x2", active: true },
      null,
    );

    expect(response.status).toBe(401);
  });
});

describe("PATCH / DELETE /api/promotions/:id", () => {
  async function seed() {
    const promotion = await Promotion.create({
      type: "quantityPack2x15",
      label: "2x15%",
      active: true,
      percent: 15,
    });
    return promotion._id.toString();
  }

  it("edita y desactiva una promoción", async () => {
    const id = await seed();

    const updated = await request(app)
      .patch(`/api/promotions/${id}`)
      .set("Cookie", admin.cookie)
      .send({
        type: "quantityPack2x15",
        label: "2 unidades al 15%",
        active: true,
        percent: 15,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.label).toBe("2 unidades al 15%");

    const deactivated = await request(app)
      .delete(`/api/promotions/${id}`)
      .set("Cookie", admin.cookie);
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.active).toBe(false);

    const list = await request(app).get("/api/promotions");
    expect(list.body).toHaveLength(0);
  });

  it("responde 404 para un id inexistente", async () => {
    const response = await request(app)
      .delete("/api/promotions/6713b0c2a1f4e9d2c8b70a99")
      .set("Cookie", admin.cookie);

    expect(response.status).toBe(404);
  });
});
