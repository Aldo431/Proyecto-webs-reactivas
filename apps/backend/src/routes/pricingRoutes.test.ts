import type { Express } from "express";
import type { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { Product } from "../models/Product.ts";
import { Promotion } from "../models/Promotion.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "../services/authService.ts";
import { seedDefaultPromotions } from "../services/promotionService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import { createSeller } from "../test/productFixtures.ts";

let mongo: MongoMemoryReplSet;
let app: Express;
let sellerId: string;
let studentCookie: string;
let buyerCookie: string;
let productId: string;

const PASSWORD = "secreto123";
const MISSING_ID = "6713b0c2a1f4e9d2c8b70a99";

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
  await Product.syncIndexes();
  await Promotion.syncIndexes();
  app = createApp();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await Product.deleteMany({});
  await Promotion.deleteMany({});
  await User.deleteMany({});
  await seedDefaultPromotions();

  const seller = await createSeller(app, "vendedorprec", "Vendedor Precios");
  sellerId = seller.id;
  const product = await Product.create({
    name: "Taza DCC",
    description: "Taza de prueba.",
    category: "Tazas",
    price: 10000,
    image: "/images/taza-dcc.png",
    seller: sellerId,
  });
  productId = product._id.toString();

  const student = await User.create({
    username: "alumnoprec",
    displayName: "Alumno Precios",
    email: "alumnoprec@uchile.cl",
    passwordHash: await hashPassword(PASSWORD),
    studentVerified: true,
  });
  const studentLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: student.email, password: PASSWORD });
  studentCookie =
    (studentLogin.headers["set-cookie"] as unknown as string[] | undefined)?.[0] ?? "";
  if (!studentCookie) throw new Error("No se pudo iniciar sesión en el test.");

  const buyer = await createSeller(app, "compradorprec", "Comprador Precios");
  buyerCookie = buyer.cookie;
});

function quote(body: unknown, cookie?: string) {
  const call = request(app).post("/api/pricing/quote");
  if (cookie) call.set("Cookie", cookie);
  return call.send(body as object);
}

function item(quantity: number, extra: Record<string, unknown> = {}) {
  return { productId, quantity, ...extra };
}

describe("POST /api/pricing/quote", () => {
  it("aplica 20% a un alumno verificado", async () => {
    const response = await quote({ items: [item(1)] }, studentCookie);

    expect(response.status).toBe(200);
    expect(response.body.subtotal).toBe(10000);
    expect(response.body.savings).toBe(2000);
    expect(response.body.total).toBe(8000);
    expect(response.body.discounts[0]).toMatchObject({
      type: "studentDiscount",
      amount: 2000,
    });
  });

  it("no aplica 20% a un usuario sin verificar", async () => {
    const response = await quote({ items: [item(1)] }, buyerCookie);

    expect(response.status).toBe(200);
    expect(response.body.savings).toBe(0);
    expect(response.body.total).toBe(10000);
  });

  it("aplica 3x2 y elige el mayor descuento sin acumular", async () => {
    const anonymous = await quote({ items: [item(3)] });
    expect(anonymous.body.savings).toBe(10000);
    expect(anonymous.body.total).toBe(20000);
    expect(anonymous.body.discounts[0].type).toBe("quantityPack3x2");

    const student = await quote({ items: [item(3)] }, studentCookie);
    expect(student.body.savings).toBe(10000);
    expect(student.body.total).toBe(20000);
    expect(student.body.discounts[0].type).toBe("quantityPack3x2");
  });

  it("aplica 2x15% para dos unidades", async () => {
    const response = await quote({ items: [item(2)] });

    expect(response.body.savings).toBe(3000);
    expect(response.body.total).toBe(17000);
    expect(response.body.discounts[0].type).toBe("quantityPack2x15");
  });

  it("usa el recargo de la variante seleccionada", async () => {
    const variant = await Product.findByIdAndUpdate(
      productId,
      {
        $push: {
          variants: {
            name: "Grande",
            stock: 10,
            priceAdjustment: 2000,
          },
        },
      },
      { new: true },
    );
    const variantId = variant?.variants?.[0]?._id.toString();
    expect(variantId).toBeTruthy();

    const response = await quote(
      { items: [item(1, { variantId })] },
      studentCookie,
    );

    expect(response.status).toBe(200);
    expect(response.body.subtotal).toBe(12000);
    expect(response.body.discounts[0].amount).toBe(2400);
  });

  it("rechaza precios o totales enviados por el cliente", async () => {
    const response = await quote({ items: [item(1)], total: 1 });
    expect(response.status).toBe(400);
  });

  it("rechaza un producto inexistente", async () => {
    const response = await quote({
      items: [{ productId: MISSING_ID, quantity: 1 }],
    });
    expect(response.status).toBe(400);
  });

  it("rechaza una variante inexistente", async () => {
    const response = await quote({
      items: [item(1, { variantId: MISSING_ID })],
    });
    expect(response.status).toBe(400);
  });

  it("rechaza stock insuficiente", async () => {
    await Product.findByIdAndUpdate(productId, {
      $push: { variants: { name: "Única", stock: 1, priceAdjustment: 0 } },
    });
    const product = await Product.findById(productId);
    const variantId = product?.variants?.[0]?._id.toString();

    const response = await quote({ items: [item(3, { variantId })] });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "La variante seleccionada no tiene stock suficiente.",
    );
  });
});
