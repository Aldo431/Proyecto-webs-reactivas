import type { Express } from "express";
import type { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.ts";
import { resetMfaRateLimits } from "../middleware/rateLimit.ts";
import { MfaChallenge } from "../models/MfaChallenge.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "../services/authService.ts";
import { emailService } from "../services/emailService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";

let mongo: MongoMemoryReplSet;
let app: Express;
let user: { id: string; cookie: string; email: string };

const PASSWORD = "secreto123";

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
  await MfaChallenge.syncIndexes();
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
  await MfaChallenge.deleteMany({});
  await User.deleteMany({});
  user = await createUser("usuariomfa", "usuariomfa@dcc.uchile.cl");
});

async function createUser(username: string, email: string) {
  const created = await User.create({
    username,
    displayName: username,
    email,
    passwordHash: await hashPassword(PASSWORD),
  });
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: PASSWORD });
  const raw = response.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = raw?.[0];
  if (response.status !== 200 || !cookie) {
    throw new Error("No se pudo iniciar sesión en el test.");
  }
  return { id: created._id.toString(), cookie, email };
}

function enableChallenge() {
  return request(app).post("/api/auth/mfa/enable").set("Cookie", user.cookie);
}

async function enableMfa() {
  const challenge = await enableChallenge();
  expect(challenge.status).toBe(202);
  const confirmed = await request(app)
    .post("/api/auth/mfa/enable/confirm")
    .set("Cookie", user.cookie)
    .send({
      challengeId: challenge.body.challengeId,
      code: challenge.body.devCode,
    });
  expect(confirmed.status).toBe(200);
}

function wrongCode(code: string): string {
  return code === "000000" ? "111111" : "000000";
}

describe("gestión de 2FA", () => {
  it("activa y desactiva la verificación en dos pasos", async () => {
    await enableMfa();
    expect((await User.findById(user.id))?.mfaEnabled).toBe(true);

    const duplicate = await enableChallenge();
    expect(duplicate.status).toBe(409);

    const disableRequest = await request(app)
      .post("/api/auth/mfa/disable/request")
      .set("Cookie", user.cookie);
    expect(disableRequest.status).toBe(202);

    const badPassword = await request(app)
      .post("/api/auth/mfa/disable")
      .set("Cookie", user.cookie)
      .send({
        challengeId: disableRequest.body.challengeId,
        code: disableRequest.body.devCode,
        password: "incorrecta",
      });
    expect(badPassword.status).toBe(401);

    const disabled = await request(app)
      .post("/api/auth/mfa/disable")
      .set("Cookie", user.cookie)
      .send({
        challengeId: disableRequest.body.challengeId,
        code: disableRequest.body.devCode,
        password: PASSWORD,
      });
    expect(disabled.status).toBe(200);
    expect((await User.findById(user.id))?.mfaEnabled).toBe(false);
  });

  it("rechaza un código inválido y expirado al activar", async () => {
    const challenge = await enableChallenge();
    const invalid = await request(app)
      .post("/api/auth/mfa/enable/confirm")
      .set("Cookie", user.cookie)
      .send({
        challengeId: challenge.body.challengeId,
        code: wrongCode(challenge.body.devCode),
      });
    expect(invalid.status).toBe(400);

    await MfaChallenge.findByIdAndUpdate(challenge.body.challengeId, {
      expiresAt: new Date(Date.now() - 1000),
    });
    const expired = await request(app)
      .post("/api/auth/mfa/enable/confirm")
      .set("Cookie", user.cookie)
      .send({
        challengeId: challenge.body.challengeId,
        code: challenge.body.devCode,
      });
    expect(expired.status).toBe(400);
  });

  it("limita los reenvíos a tres", async () => {
    const challenge = await enableChallenge();
    resetMfaRateLimits(challenge.body.challengeId);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/mfa/resend")
        .send({ challengeId: challenge.body.challengeId });
      expect(response.status).toBe(202);
      expect(response.body.devCode).toMatch(/^\d{6}$/);
    }

    const blocked = await request(app)
      .post("/api/auth/mfa/resend")
      .send({ challengeId: challenge.body.challengeId });
    expect(blocked.status).toBe(429);
  });
});

describe("login en dos pasos", () => {
  it("no entrega cookie hasta verificar el código", async () => {
    await enableMfa();

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.mfaRequired).toBe(true);
    expect(login.body.challengeId).toBeTruthy();
    expect(login.headers["set-cookie"]).toBeUndefined();

    const verified = await request(app)
      .post("/api/auth/mfa/verify")
      .send({
        challengeId: login.body.challengeId,
        code: login.body.devCode,
      });
    expect(verified.status).toBe(200);
    expect(verified.body.mfaEnabled).toBe(true);
    expect(verified.headers["set-cookie"]).toBeDefined();

    const reused = await request(app)
      .post("/api/auth/mfa/verify")
      .send({
        challengeId: login.body.challengeId,
        code: login.body.devCode,
      });
    expect(reused.status).toBe(400);
  });

  it("bloquea después de cinco intentos fallidos", async () => {
    await enableMfa();
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: PASSWORD });
    resetMfaRateLimits(login.body.challengeId);
    const bad = wrongCode(login.body.devCode);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/mfa/verify")
        .send({ challengeId: login.body.challengeId, code: bad });
      expect(response.status).toBe(400);
    }
    const blocked = await request(app)
      .post("/api/auth/mfa/verify")
      .send({ challengeId: login.body.challengeId, code: bad });
    expect(blocked.status).toBe(429);
  });

  it("rechaza un desafío de otro usuario", async () => {
    await enableMfa();
    const other = await createUser("otromfa", "otromfa@dcc.uchile.cl");
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: PASSWORD });

    const response = await request(app)
      .post("/api/auth/mfa/enable/confirm")
      .set("Cookie", other.cookie)
      .send({
        challengeId: login.body.challengeId,
        code: login.body.devCode,
      });
    expect(response.status).toBe(400);
  });
});
