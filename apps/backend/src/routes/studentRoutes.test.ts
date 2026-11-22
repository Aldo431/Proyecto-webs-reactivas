import type { Express } from "express";
import type { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { STUDENT_EMAIL_MESSAGE } from "@tiendadcc/utils";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.ts";
import { resetStudentCodeRateLimits } from "../middleware/rateLimit.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "../services/authService.ts";
import { emailService } from "../services/emailService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";

let mongo: MongoMemoryReplSet;
let app: Express;
let cookie: string;
let userId: string;

const PASSWORD = "secreto123";
const STUDENT_EMAIL = "alumno@uchile.cl";

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
  vi.spyOn(emailService, "sendStudentCodeEmail").mockResolvedValue(undefined);
  await User.deleteMany({});
  resetStudentCodeRateLimits(STUDENT_EMAIL);
  const user = await User.create({
    username: "alumno",
    displayName: "Alumno DCC",
    email: STUDENT_EMAIL,
    passwordHash: await hashPassword(PASSWORD),
  });
  userId = user._id.toString();
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: STUDENT_EMAIL, password: PASSWORD });
  const raw = response.headers["set-cookie"] as unknown as string[] | undefined;
  cookie = raw?.[0] ?? "";
  if (!cookie) throw new Error("No se pudo iniciar sesión en el test.");
});

function requestCode(email: string, withSession = true) {
  const call = request(app).post("/api/students/verify");
  if (withSession) call.set("Cookie", cookie);
  return call.send({ email });
}

function confirmCode(code: string) {
  return request(app)
    .post("/api/students/confirm")
    .set("Cookie", cookie)
    .send({ code });
}

async function startVerification() {
  const response = await requestCode(STUDENT_EMAIL);
  expect(response.status).toBe(202);
  expect(response.body.devCode).toMatch(/^\d{6}$/);
  return response.body.devCode as string;
}

describe("POST /api/students/verify", () => {
  it("responde 401 sin sesión", async () => {
    const response = await requestCode(STUDENT_EMAIL, false);
    expect(response.status).toBe(401);
  });

  it("rechaza un correo que no es institucional", async () => {
    const response = await requestCode("alumno@gmail.com");
    expect(response.status).toBe(400);
    expect(response.body.fieldErrors?.email).toContain(STUDENT_EMAIL_MESSAGE);
  });

  it("acepta un subdominio institucional como ug.uchile.cl", async () => {
    const email = "alumno@ug.uchile.cl";
    resetStudentCodeRateLimits(email);
    const response = await requestCode(email);
    expect(response.status).toBe(202);
    expect(emailService.sendStudentCodeEmail).toHaveBeenCalledWith(
      email,
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it("guarda solo el hash del código y devuelve devCode en test", async () => {
    const code = await startVerification();
    const user = await User.findById(userId);

    expect(user?.studentCodeHash).toBeTruthy();
    expect(user?.studentCodeHash).not.toBe(code);
    expect(user?.studentCodeExpiry).toBeInstanceOf(Date);
  });
});

describe("POST /api/students/confirm", () => {
  it("verifica al alumno con el código correcto y limpia el reto", async () => {
    const code = await startVerification();

    const response = await confirmCode(code);
    expect(response.status).toBe(200);

    const user = await User.findById(userId);
    expect(user?.studentVerified).toBe(true);
    expect(user?.studentCodeHash).toBeNull();
    expect(user?.studentCodeExpiry).toBeNull();
    expect(user?.studentCodeAttempts).toBe(0);
  });

  it("rechaza un código erróneo y bloquea después de cinco intentos", async () => {
    const code = await startVerification();
    const wrongCode = code === "000000" ? "111111" : "000000";

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await confirmCode(wrongCode);
      expect(response.status).toBe(400);
    }
    const blocked = await confirmCode(wrongCode);
    expect(blocked.status).toBe(429);

    const user = await User.findById(userId);
    expect(user?.studentVerified).toBe(false);
    expect(user?.studentCodeHash).toBeNull();
  });

  it("rechaza un código expirado", async () => {
    const code = await startVerification();
    await User.findByIdAndUpdate(userId, {
      studentCodeExpiry: new Date(Date.now() - 1000),
    });

    const response = await confirmCode(code);
    expect(response.status).toBe(400);
  });
});

describe("cambio de correo", () => {
  it("quita el beneficio de alumno al cambiar el correo", async () => {
    const code = await startVerification();
    await confirmCode(code);

    const response = await request(app)
      .put("/api/users/me")
      .set("Cookie", cookie)
      .send({
        username: "alumno",
        displayName: "Alumno DCC",
        email: "otro@dcc.uchile.cl",
        currentPassword: PASSWORD,
      });

    expect(response.status).toBe(200);
    expect(response.body.studentVerified).toBe(false);

    const user = await User.findById(userId);
    expect(user?.studentVerified).toBe(false);
    expect(user?.studentCodeHash).toBeNull();
    expect(user?.studentCodeExpiry).toBeNull();
    expect(user?.studentCodeAttempts).toBe(0);
  });
});
