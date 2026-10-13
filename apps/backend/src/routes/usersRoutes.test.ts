import type { Express } from "express";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "../services/authService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";

let mongo: MongoMemoryServer;
let app: Express;

const credentials = {
  name: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  password: "secreto123",
};

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
});

async function loginCookie(email = credentials.email): Promise<string> {
  await User.create({
    name: credentials.name,
    email,
    passwordHash: await hashPassword(credentials.password),
  });
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: credentials.password });

  expect(response.status).toBe(200);
  const raw = response.headers["set-cookie"] as unknown as
    | string[]
    | undefined;
  const cookie = raw?.[0];
  if (!cookie) {
    throw new Error("La respuesta no incluye la cookie de sesión.");
  }
  return cookie;
}

describe("GET /api/users/me", () => {
  it("responde 200 con el perfil completo incluido el carrito", async () => {
    const cookie = await loginCookie();

    const response = await request(app)
      .get("/api/users/me")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      name: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      emailVerified: false,
      favorites: [],
      history: [],
      cart: [],
    });
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("normaliza un documento legacy sin los campos nuevos", async () => {
    await User.collection.insertOne({
      name: credentials.name,
      email: credentials.email,
      passwordHash: await hashPassword(credentials.password),
    });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });
    const rawLegacy = login.headers["set-cookie"] as unknown as
      | string[]
      | undefined;
    const cookie = rawLegacy?.[0];
    if (!cookie) {
      throw new Error("La respuesta no incluye la cookie de sesión.");
    }

    const response = await request(app)
      .get("/api/users/me")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.favorites).toEqual([]);
    expect(response.body.history).toEqual([]);
    expect(response.body.cart).toEqual([]);
    expect(response.body.emailVerified).toBe(false);
  });

  it("responde 401 sin sesión", async () => {
    const response = await request(app).get("/api/users/me");

    expect(response.status).toBe(401);
  });
});

describe("PUT /api/users/me", () => {
  it("actualiza y responde 200 con el perfil normalizado", async () => {
    const cookie = await loginCookie();

    const response = await request(app)
      .put("/api/users/me")
      .set("Cookie", cookie)
      .send({
        name: "Ana P.",
        email: "NUEVA@DCC.UCHILE.CL",
        currentPassword: "secreto123",
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Ana P.");
    expect(response.body.email).toBe("nueva@dcc.uchile.cl");
    expect(response.body.emailVerified).toBe(false);
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("responde 401 sin modificar nada con contraseña incorrecta", async () => {
    const cookie = await loginCookie();

    const response = await request(app)
      .put("/api/users/me")
      .set("Cookie", cookie)
      .send({
        name: "Otro",
        email: "otro@dcc.uchile.cl",
        currentPassword: "incorrecta",
      });

    expect(response.status).toBe(401);
    const profile = await request(app)
      .get("/api/users/me")
      .set("Cookie", cookie);
    expect(profile.body.name).toBe("Ana Pérez");
  });

  it("responde 400 con cuerpo inválido", async () => {
    const cookie = await loginCookie();

    const response = await request(app)
      .put("/api/users/me")
      .set("Cookie", cookie)
      .send({ name: "", email: "ana@", currentPassword: "" });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toBeDefined();
  });

  it("responde 409 con el correo de otro usuario en distinto caso", async () => {
    await User.create({
      name: "Otro",
      email: "otro@dcc.uchile.cl",
      passwordHash: await hashPassword("secreto123"),
    });
    const cookie = await loginCookie();

    const response = await request(app)
      .put("/api/users/me")
      .set("Cookie", cookie)
      .send({
        name: "Ana Pérez",
        email: "OTRO@DCC.UCHILE.CL",
        currentPassword: "secreto123",
      });

    expect(response.status).toBe(409);
  });

  it("ignora campos extra como isAdmin, favorites y cart", async () => {
    const cookie = await loginCookie();

    const response = await request(app)
      .put("/api/users/me")
      .set("Cookie", cookie)
      .send({
        name: "Ana Pérez",
        email: "ana@dcc.uchile.cl",
        currentPassword: "secreto123",
        isAdmin: true,
        favorites: ["taza-dcc"],
        cart: [{ productId: "taza-dcc", quantity: 5 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.favorites).toEqual([]);
    expect(response.body.cart).toEqual([]);
  });

  it("responde 401 sin sesión", async () => {
    const response = await request(app).put("/api/users/me").send({
      name: "Ana",
      email: "ana@dcc.uchile.cl",
      currentPassword: "secreto123",
    });

    expect(response.status).toBe(401);
  });
});

describe("favoritos", () => {
  it("agrega sin duplicar y elimina de forma idempotente", async () => {
    const cookie = await loginCookie();

    const added = await request(app)
      .post("/api/users/me/favorites")
      .set("Cookie", cookie)
      .send({ productId: "taza-dcc" });
    expect(added.status).toBe(200);
    expect(added.body).toEqual(["taza-dcc"]);

    const duplicated = await request(app)
      .post("/api/users/me/favorites")
      .set("Cookie", cookie)
      .send({ productId: "taza-dcc" });
    expect(duplicated.status).toBe(200);
    expect(duplicated.body).toEqual(["taza-dcc"]);

    const removed = await request(app)
      .delete("/api/users/me/favorites/taza-dcc")
      .set("Cookie", cookie);
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual([]);

    const idempotent = await request(app)
      .delete("/api/users/me/favorites/taza-dcc")
      .set("Cookie", cookie);
    expect(idempotent.status).toBe(200);
    expect(idempotent.body).toEqual([]);
  });

  it("responde 400 con productId inválido", async () => {
    const cookie = await loginCookie();

    const response = await request(app)
      .post("/api/users/me/favorites")
      .set("Cookie", cookie)
      .send({ productId: "   " });

    expect(response.status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    const response = await request(app)
      .post("/api/users/me/favorites")
      .send({ productId: "taza-dcc" });

    expect(response.status).toBe(401);
  });
});

describe("POST /api/users/me/history", () => {
  it("registra y mueve la visita al frente", async () => {
    const cookie = await loginCookie();

    await request(app)
      .post("/api/users/me/history")
      .set("Cookie", cookie)
      .send({ productId: "taza-dcc" });
    const response = await request(app)
      .post("/api/users/me/history")
      .set("Cookie", cookie)
      .send({ productId: "polera-dcc" });
    const revisited = await request(app)
      .post("/api/users/me/history")
      .set("Cookie", cookie)
      .send({ productId: "taza-dcc" });

    expect(response.status).toBe(200);
    expect(revisited.body.map((visit: { productId: string }) => visit.productId)).toEqual([
      "taza-dcc",
      "polera-dcc",
    ]);
  });

  it("responde 400 con productId inválido y 401 sin sesión", async () => {
    const cookie = await loginCookie();

    const invalid = await request(app)
      .post("/api/users/me/history")
      .set("Cookie", cookie)
      .send({ productId: "" });
    expect(invalid.status).toBe(400);

    const anonymous = await request(app)
      .post("/api/users/me/history")
      .send({ productId: "taza-dcc" });
    expect(anonymous.status).toBe(401);
  });
});

describe("PUT /api/users/me/cart", () => {
  it("reemplaza el carrito y viaja en el perfil", async () => {
    const cookie = await loginCookie();

    const replaced = await request(app)
      .put("/api/users/me/cart")
      .set("Cookie", cookie)
      .send([{ productId: "taza-dcc", quantity: 2 }]);

    expect(replaced.status).toBe(200);
    expect(replaced.body).toEqual([
      { productId: "taza-dcc", quantity: 2 },
    ]);

    const profile = await request(app)
      .get("/api/users/me")
      .set("Cookie", cookie);
    expect(profile.body.cart).toEqual([
      { productId: "taza-dcc", quantity: 2 },
    ]);
  });

  it("vacía el carrito con un arreglo vacío", async () => {
    const cookie = await loginCookie();

    await request(app)
      .put("/api/users/me/cart")
      .set("Cookie", cookie)
      .send([{ productId: "taza-dcc", quantity: 2 }]);
    const emptied = await request(app)
      .put("/api/users/me/cart")
      .set("Cookie", cookie)
      .send([]);

    expect(emptied.status).toBe(200);
    expect(emptied.body).toEqual([]);
  });

  it("responde 400 sin modificar con líneas inválidas", async () => {
    const cookie = await loginCookie();

    await request(app)
      .put("/api/users/me/cart")
      .set("Cookie", cookie)
      .send([{ productId: "taza-dcc", quantity: 2 }]);
    const invalid = await request(app)
      .put("/api/users/me/cart")
      .set("Cookie", cookie)
      .send([{ productId: "taza-dcc", quantity: 0 }]);

    expect(invalid.status).toBe(400);
    const profile = await request(app)
      .get("/api/users/me")
      .set("Cookie", cookie);
    expect(profile.body.cart).toEqual([
      { productId: "taza-dcc", quantity: 2 },
    ]);
  });

  it("responde 401 sin sesión", async () => {
    const response = await request(app)
      .put("/api/users/me/cart")
      .send([{ productId: "taza-dcc", quantity: 1 }]);

    expect(response.status).toBe(401);
  });
});
