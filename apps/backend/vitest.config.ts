import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-secret",
      MONGODB_URI: "mongodb://127.0.0.1:27017/tiendadcc-test",
      CLIENT_ORIGIN: "http://localhost:5173",
      SMTP_HOST: "smtp.test.invalid",
      SMTP_PORT: "587",
      SMTP_USER: "test-user",
      SMTP_PASS: "test-password",
      SMTP_FROM: "no-reply@example.test",
    },
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
