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
import { Counter } from "../models/Counter.ts";
import { Order } from "../models/Order.ts";
import { Product } from "../models/Product.ts";
import { User } from "../models/User.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import {
  createProduct,
  createSeller,
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
  await Order.syncIndexes();
  await Counter.syncIndexes();
  app = createApp();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await Order.deleteMany({});
  await Counter.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
  ana = await createSeller(app, "anaperez", "Ana Pérez");
  beto = await createSeller(app, "betoruiz", "Beto Ruiz");
});

afterEach(() => {
  vi.restoreAllMocks();
});

const year = new Date().getFullYear();
const folioOf = (sequence: number) =>
  `PED-${year}-${String(sequence).padStart(4, "0")}`;
const MISSING_ID = "6713b0c2a1f4e9d2c8b70a99";
const UNAVAILABLE_MESSAGE =
  "Uno de los productos de tu carrito ya no está disponible.";

function purchase(body: unknown, buyer: TestSeller = ana) {
  return request(app)
    .post("/api/orders")
    .set("Cookie", buyer.cookie)
    .send(body as object);
}

describe("POST /api/orders", () => {
  it("responde 401 sin sesión y no crea nada", async () => {
    const response = await request(app)
      .post("/api/orders")
      .send({ items: [{ productId: MISSING_ID, quantity: 1 }] });

    expect(response.status).toBe(401);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("crea el pedido con snapshot del servidor e ignora precios del body", async () => {
    const taza = await createProduct(ana.id, {
      name: "Taza DCC",
      price: 6000,
      image: "/images/taza-dcc.png",
    });

    const response = await purchase({
      items: [
        {
          productId: taza._id.toString(),
          quantity: 2,
          unitPrice: 1,
          subtotal: 1,
          total: 1,
          folio: "PED-1900-9999",
        },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: "completado",
      total: 12000,
      folio: folioOf(1),
    });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      productId: taza._id.toString(),
      name: "Taza DCC",
      image: "/images/taza-dcc.png",
      unitPrice: 6000,
      quantity: 2,
      subtotal: 12000,
    });
    expect(JSON.stringify(response.body)).not.toContain("cardNumber");
    expect(JSON.stringify(response.body)).not.toContain("cvc");
  });

  it("asigna folios correlativos y conserva cuatro o más dígitos", async () => {
    const taza = await createProduct(ana.id);

    const first = await purchase({
      items: [{ productId: taza._id.toString(), quantity: 1 }],
    });
    const second = await purchase({
      items: [{ productId: taza._id.toString(), quantity: 1 }],
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.folio).toBe(folioOf(1));
    expect(second.body.folio).toBe(folioOf(2));

    await Counter.updateOne(
      { _id: "orderFolio" },
      { $set: { value: 9999 } },
    );
    const big = await purchase({
      items: [{ productId: taza._id.toString(), quantity: 1 }],
    });
    expect(big.status).toBe(201);
    expect(big.body.folio).toBe(`PED-${year}-10000`);
  });

  it("responde 400 con un producto inexistente y no persiste nada", async () => {
    const response = await purchase({
      items: [{ productId: MISSING_ID, quantity: 1 }],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(UNAVAILABLE_MESSAGE);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("responde 400 con un productId mal formado", async () => {
    for (const productId of ["no-es-object-id", "abc123", "6713b0c2a1f4e9d2c8b70a9"]) {
      const response = await purchase({ items: [{ productId, quantity: 1 }] });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(UNAVAILABLE_MESSAGE);
    }
    expect(await Order.countDocuments()).toBe(0);
  });

  it("rechaza cuerpos inválidos con 400 y no persiste nada", async () => {
    for (const body of [
      { items: [] },
      {},
      { items: [{ productId: "6713b0c2a1f4e9d2c8b70a9", quantity: 0 }] },
      { items: [{ productId: "6713b0c2a1f4e9d2c8b70a9", quantity: 1000 }] },
      { items: [{ productId: "6713b0c2a1f4e9d2c8b70a9", quantity: 1.5 }] },
    ]) {
      const response = await purchase(body);
      expect(response.status).toBe(400);
    }
    expect(await Order.countDocuments()).toBe(0);
  });

  it("el pedido conserva el snapshot aunque el producto cambie o se borre", async () => {
    const taza = await createProduct(ana.id, {
      name: "Taza DCC",
      price: 6000,
    });

    const created = await purchase({
      items: [{ productId: taza._id.toString(), quantity: 1 }],
    });
    expect(created.status).toBe(201);

    await Product.findByIdAndUpdate(taza._id, {
      name: "Taza renombrada",
      price: 9999,
    });
    await Product.deleteOne({ _id: taza._id });

    const list = await request(app)
      .get("/api/orders")
      .set("Cookie", ana.cookie);
    expect(list.status).toBe(200);
    expect(list.body[0].items[0]).toMatchObject({
      name: "Taza DCC",
      unitPrice: 6000,
      subtotal: 6000,
    });
    expect(list.body[0].total).toBe(6000);
  });
});

describe("GET /api/orders", () => {
  it("responde 401 sin sesión", async () => {
    const response = await request(app).get("/api/orders");

    expect(response.status).toBe(401);
  });

  it("devuelve solo los pedidos propios, del más reciente al más antiguo", async () => {
    const taza = await createProduct(ana.id);

    await purchase({
      items: [{ productId: taza._id.toString(), quantity: 1 }],
    });
    await purchase({
      items: [{ productId: taza._id.toString(), quantity: 2 }],
    });
    await purchase(
      { items: [{ productId: taza._id.toString(), quantity: 1 }] },
      beto,
    );

    const anaResponse = await request(app)
      .get("/api/orders")
      .set("Cookie", ana.cookie);
    expect(anaResponse.status).toBe(200);
    expect(anaResponse.body).toHaveLength(2);
    expect(anaResponse.body.map((o: { total: number }) => o.total)).toEqual([
      12000, 6000,
    ]);
    expect(
      anaResponse.body.every(
        (o: { status: string }) => o.status === "completado",
      ),
    ).toBe(true);

    const betoResponse = await request(app)
      .get("/api/orders")
      .set("Cookie", beto.cookie);
    expect(betoResponse.status).toBe(200);
    expect(betoResponse.body).toHaveLength(1);
    expect(betoResponse.body[0].total).toBe(6000);
  });

  it("devuelve un arreglo vacío para un usuario sin pedidos", async () => {
    const response = await request(app)
      .get("/api/orders")
      .set("Cookie", beto.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
