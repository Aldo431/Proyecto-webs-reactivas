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
    },
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
