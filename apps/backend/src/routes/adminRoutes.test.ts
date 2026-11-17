import type { Express } from "express";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "../services/authService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";

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
