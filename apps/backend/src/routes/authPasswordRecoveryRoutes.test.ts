import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../app.ts";
import { User } from "../models/User.ts";
import { resetForgotPasswordRateLimits } from "../middleware/rateLimit.ts";
import { emailService } from "../services/emailService.ts";
import { signToken } from "../services/authService.ts";

let mongoServer: MongoMemoryServer;
const app = createApp();

// Mock the email service
vi.mock("../services/emailService.ts", () => ({
  emailService: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  vi.clearAllMocks();
  for (const ip of ["::ffff:127.0.0.1", "127.0.0.1"]) {
    for (const email of ["test@example.com", "test2@example.com", "test3@example.com", "test4@example.com"]) {
      resetForgotPasswordRateLimits(ip, email);
    }
  }
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 and sends email when user exists", async () => {
    // Create a user
    const user = await User.create({
      username: "testuser",
      email: "test@example.com",
      passwordHash: "hash",
      displayName: "Test User",
    });

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "test@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe(
      "Si el correo existe, recibirás un enlace para restablecer tu contraseña."
    );

    // Verify token was created in database
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.resetToken).toBeDefined();
    expect(updatedUser?.resetTokenExpiry).toBeDefined();
    expect(updatedUser?.resetTokenExpiry!.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns 200 with generic message when user does not exist", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nonexistent@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe(
      "Si el correo existe, recibirás un enlace para restablecer tu contraseña."
    );
  });

  it("returns 400 for invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "invalid-email" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  it("returns 400 when email is missing", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({});

    expect(response.status).toBe(400);
  });

  it("does not expose a development token in test mode", async () => {
    await User.create({
      username: "testuser2",
      email: "test2@example.com",
      passwordHash: "hash",
      displayName: "Test User",
    });

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "test2@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("devToken");
  });

  it("returns a generic 500 and clears the token when email delivery fails", async () => {
    const user = await User.create({
      username: "deliveryfailure",
      email: "failure@example.com",
      passwordHash: "hash",
      displayName: "Test User",
    });
    vi.mocked(emailService.sendPasswordResetEmail).mockRejectedValueOnce(
      new Error("SMTP unavailable"),
    );

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "No se pudo enviar el correo. Intenta más tarde.",
    );
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.resetToken).toBeNull();
  });

  it("limits an email to three requests per hour and provides Retry-After", async () => {
    const email = "email-limit@example.com";
    for (let index = 0; index < 3; index += 1) {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email });
      expect(response.status).toBe(200);
    }

    const limited = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email });
    expect(limited.status).toBe(429);
    expect(limited.body.message).toContain("Has excedido");
    expect(limited.headers["retry-after"]).toBeDefined();
  });

  it("limits an IP to five requests per hour", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: `ip-limit-${index}@example.com` });
      expect(response.status).toBe(200);
    }

    const limited = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ip-limit-final@example.com" });
    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
  });
});

describe("GET /api/auth/validate-reset-token/:token", () => {
  it("returns valid: true for valid token", async () => {
    const token = "a".repeat(64);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await User.create({
      username: "testuser",
      email: "test@example.com",
      passwordHash: "hash",
      displayName: "Test User",
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    const response = await request(app)
      .get(`/api/auth/validate-reset-token/${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: true });
  });

  it("returns valid: false for expired token", async () => {
    const token = "b".repeat(64);
    const expiry = new Date(Date.now() - 1000); // 1 second ago

    await User.create({
      username: "testuser2",
      email: "test2@example.com",
      passwordHash: "hash",
      displayName: "Test User",
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    const response = await request(app)
      .get(`/api/auth/validate-reset-token/${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false });
  });

  it("returns valid: false for non-existent token", async () => {
    const token = "c".repeat(64);

    const response = await request(app)
      .get(`/api/auth/validate-reset-token/${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false });
  });

  it("returns valid: false for invalid token format", async () => {
    const response = await request(app)
      .get("/api/auth/validate-reset-token/invalid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false });
  });

  it("returns valid: false for token with wrong length", async () => {
    const response = await request(app)
      .get(`/api/auth/validate-reset-token/${"d".repeat(63)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valid: false });
  });
});

describe("POST /api/auth/reset-password", () => {
  it("returns 200 and updates password for valid token", async () => {
    const token = "e".repeat(64);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    const oldPasswordHash = "old-hash";

    await User.create({
      username: "testuser",
      email: "test@example.com",
      passwordHash: oldPasswordHash,
      displayName: "Test User",
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "newPassword123" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe(
      "Contraseña restablecida con éxito. Ya puedes iniciar sesión."
    );

    // Verify password was updated and token was cleared
    const user = await User.findOne({ email: "test@example.com" });
    expect(user?.passwordHash).not.toBe(oldPasswordHash);
    expect(user?.resetToken).toBeNull();
    expect(user?.resetTokenExpiry).toBeNull();
  });

  it("revokes existing sessions after resetting the password", async () => {
    const token = "b".repeat(64);
    const user = await User.create({
      username: "sessionuser",
      email: "session@example.com",
      passwordHash: "old-hash",
      displayName: "Session User",
      resetToken: token,
      resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
    });
    const oldSession = signToken(user._id.toString(), "test-secret", 0);

    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "newPassword123" });
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.headers["set-cookie"]?.[0]).toContain("token=");

    const profileResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `token=${oldSession}`);
    expect(profileResponse.status).toBe(401);
  });

  it("returns 400 for expired token", async () => {
    const token = "f".repeat(64);
    const expiry = new Date(Date.now() - 1000); // 1 second ago

    await User.create({
      username: "testuser2",
      email: "test2@example.com",
      passwordHash: "hash",
      displayName: "Test User",
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "newPassword123" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe(
      "El enlace de restablecimiento es inválido o ha expirado."
    );
  });

  it("returns 400 for non-existent token", async () => {
    const token = "g".repeat(64);

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "newPassword123" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  it("returns 400 for invalid password", async () => {
    const token = "h".repeat(64);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await User.create({
      username: "testuser3",
      email: "test3@example.com",
      passwordHash: "hash",
      displayName: "Test User",
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "short" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  it("returns 400 when trying to reuse token", async () => {
    const token = "a".repeat(64);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await User.create({
      username: "testuser4",
      email: "test4@example.com",
      passwordHash: "hash",
      displayName: "Test User",
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    // First reset
    const response1 = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "newPassword123" });

    expect(response1.status).toBe(200);

    // Try to reuse token
    const response2 = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "anotherPassword123" });

    expect(response2.status).toBe(400);
    expect(response2.body).toHaveProperty("message");
  });

  it("returns 400 for invalid token format", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "invalid-token", password: "newPassword123" });

    expect(response.status).toBe(400);
  });

  it("returns 400 when fields are missing", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({});

    expect(response.status).toBe(400);
  });
});
