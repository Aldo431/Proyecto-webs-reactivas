import type { Express } from "express";
import type { MongoMemoryReplSet } from "mongodb-memory-server";
import request, { type Response } from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.ts";
import { User } from "../models/User.ts";
import { emailService } from "../services/emailService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";

let mongo: MongoMemoryReplSet;
let app: Express;

const validUser = {
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  password: "secreto123",
  passwordConfirm: "secreto123",
};

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
  app = createApp();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(async () => {
  vi.spyOn(emailService, "sendMfaCodeEmail").mockResolvedValue(undefined);
  await User.deleteMany({});
});

function getSessionCookie(response: Response): string {
  const raw = response.headers["set-cookie"] as unknown as
    | string[]
    | undefined;
  const cookie = raw?.[0];
  if (!cookie) {
    throw new Error("La respuesta no incluye la cookie de sesión.");
  }
  return cookie;
}

describe("POST /api/auth/register", () => {
  it("ignora role en el cuerpo y crea la cuenta como user (spec 012 RF-2)", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, role: "admin" });

    expect(response.status).toBe(201);
    expect(response.body.role).toBe("user");
    const stored = await User.findOne({ email: "ana@dcc.uchile.cl" });
    expect(stored?.role).toBe("user");
  });

  it("registra y responde 201 con datos públicos y cookie httpOnly", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validUser);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      username: "anaperez",
      displayName: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      role: "user",
      studentVerified: false,
      mfaEnabled: false,
    });
    expect(response.body).not.toHaveProperty("passwordHash");
    expect(response.body).not.toHaveProperty("__v");

    const cookie = getSessionCookie(response);
    expect(cookie).toContain("token=");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("responde 409 ante un correo ya registrado", async () => {
    await request(app).post("/api/auth/register").send(validUser);

    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "ANA@DCC.UCHILE.CL" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Ya existe una cuenta con ese correo electrónico.",
    );
    expect(await User.countDocuments()).toBe(1);
  });

  it("responde 409 ante un username ya registrado sin distinguir caso", async () => {
    await request(app).post("/api/auth/register").send(validUser);

    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, username: "ANAPEREZ", email: "otra@dcc.uchile.cl" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Ese nombre de usuario ya está en uso.",
    );
    expect(await User.countDocuments()).toBe(1);
  });

  it("responde 400 con errores por campo ante datos inválidos", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "correo-malo", password: "corta" });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toMatchObject({
      email: expect.any(String),
      password: expect.any(String),
    });
    expect(await User.countDocuments()).toBe(0);
  });

  it("responde 400 ante un JSON mal formado", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
  });

  it("ignora campos desconocidos y no los asigna al usuario", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, isAdmin: true });

    expect(response.status).toBe(201);

    const stored = await User.findOne({ email: validUser.email }).lean();
    expect(stored).not.toHaveProperty("isAdmin");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(validUser);
  });

  it("inicia sesión con credenciales válidas y emite cookie", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      username: "anaperez",
      displayName: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      role: "user",
      studentVerified: false,
      mfaEnabled: false,
    });
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("devuelve un desafío 2FA sin cookie para usuarios con 2FA activado", async () => {
    await User.findOneAndUpdate(
      { email: validUser.email },
      { mfaEnabled: true },
    );

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      mfaRequired: true,
      message: expect.any(String),
      devCode: expect.stringMatching(/^\d{6}$/),
    });
    expect(response.body.challengeId).toBeTruthy();
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(response.body).not.toHaveProperty("id");
  });

  it("responde 401 genérico con contraseña incorrecta", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "incorrecta" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Correo o contraseña incorrectos.");
  });

  it("responde 401 genérico cuando el correo no existe", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@dcc.uchile.cl", password: "secreto123" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Correo o contraseña incorrectos.");
  });

  it("responde 400 ante un cuerpo inválido", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-es-correo", password: "" });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("responde 401 sin cookie de sesión", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty("id");
  });

  it("responde 200 con los datos públicos cuando hay sesión", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(validUser);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", getSessionCookie(registerResponse));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      username: "anaperez",
      displayName: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      role: "user",
      studentVerified: false,
      mfaEnabled: false,
    });
  });

  it("responde 401 con una cookie inválida", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "token=cookie-invalida");

    expect(response.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("borra la cookie y responde 204", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(validUser);

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", getSessionCookie(registerResponse));

    expect(response.status).toBe(204);
    expect(getSessionCookie(response)).toContain("token=");
  });

  it("responde 204 sin sesión activa (idempotente)", async () => {
    const response = await request(app).post("/api/auth/logout");
    expect(response.status).toBe(204);
  });
});
