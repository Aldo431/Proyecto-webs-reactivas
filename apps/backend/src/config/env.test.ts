import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.ts";

const baseEnv = {
  MONGODB_URI: "mongodb://localhost:27017/test",
  JWT_SECRET: "test-secret",
  CLIENT_ORIGIN: "http://localhost:5173",
};

const smtpEnv = {
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "587",
  SMTP_USER: "test-user",
  SMTP_PASS: "test-password",
  SMTP_FROM: "no-reply@example.test",
};

describe("parseEnv SMTP configuration", () => {
  it("allows development mode to omit SMTP for the console bypass", () => {
    const result = parseEnv({ ...baseEnv, NODE_ENV: "development" });
    expect(result.success).toBe(true);
  });

  it("requires valid SMTP settings in test and production", () => {
    for (const nodeEnv of ["test", "production"] as const) {
      const result = parseEnv({ ...baseEnv, NODE_ENV: nodeEnv });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.message).toContain("SMTP_HOST");
    }
  });

  it("accepts complete SMTP settings and coerces the port", () => {
    const result = parseEnv({
      ...baseEnv,
      NODE_ENV: "production",
      ...smtpEnv,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.env.smtpPort).toBe(587);
  });

  it("rejects blank SMTP credentials and an invalid sender address", () => {
    const result = parseEnv({
      ...baseEnv,
      NODE_ENV: "production",
      ...smtpEnv,
      SMTP_PASS: "",
      SMTP_FROM: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("SMTP_PASS");
      expect(result.message).toContain("SMTP_FROM");
    }
  });
});
