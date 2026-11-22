import { defineConfig, devices } from "@playwright/test";

// Configuración de la suite E2E (spec 016). Playwright levanta el sistema
// completo antes de los tests:
// - backend Express en modo test (NODE_ENV=test) con MongoDB en memoria, en
//   http://localhost:3001 (expone POST /api/testing/reset);
// - frontend Vite en http://localhost:5173, que proxya /api al backend.
// Si alguno de los puertos ya está ocupado (p. ej. por `npm run dev`), la
// suite falla en vez de reutilizarlo: así nunca apunta a la base de desarrollo.
const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:3001";
const isCI = process.env.CI !== undefined;

export default defineConfig({
  testDir: "./tests",
  // La base de datos es compartida: un solo worker y tests en orden.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: FRONTEND_URL,
    locale: "es-CL",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // La app respeta prefers-reduced-motion: sin esperas por animaciones.
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run start:e2e -w backend",
      cwd: "..",
      url: `${BACKEND_URL}/api/auth/me`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      env: {
        NODE_ENV: "test",
        PORT: "3001",
        JWT_SECRET: "e2e-secret-no-usar-en-produccion",
        CLIENT_ORIGIN: FRONTEND_URL,
        SMTP_HOST: "smtp.e2e.invalid",
        SMTP_PORT: "587",
        SMTP_USER: "e2e",
        SMTP_PASS: "e2e",
        SMTP_FROM: "no-reply@e2e.test",
      },
    },
    {
      command: "npm run dev -w tiendadcc-client -- --port 5173 --strictPort",
      cwd: "..",
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
