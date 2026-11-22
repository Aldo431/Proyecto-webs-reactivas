import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test";

// Utilidades compartidas por los tests E2E (spec 016), al estilo de los
// helpers `loginWith`/`createNote` de la cátedra 09.

export interface TestUser {
  username: string;
  displayName: string;
  email: string;
  password: string;
}

export const SELLER: TestUser = {
  username: "vendedorae2e",
  displayName: "Vendedora E2E",
  email: "vendedora@e2e.test",
  password: "clave-vendedora-123",
};

export const BUYER: TestUser = {
  username: "compradore2e",
  displayName: "Comprador E2E",
  email: "comprador@e2e.test",
  password: "clave-comprador-123",
};

export const PRODUCT_IMAGE_PATH = fileURLToPath(
  new URL("../fixtures/producto.png", import.meta.url),
);

const PRODUCT_IMAGE_DATA_URL = `data:image/png;base64,${readFileSync(
  PRODUCT_IMAGE_PATH,
).toString("base64")}`;

// Vacía la base del backend de test (POST /api/testing/reset, solo existe con
// NODE_ENV=test). Las peticiones van por el proxy de Vite (baseURL).
export async function resetDatabase(request: APIRequestContext): Promise<void> {
  const response = await request.post("/api/testing/reset");
  expect(response.status(), "POST /api/testing/reset").toBe(204);
}

// Crea la cuenta por la API. Usa un contexto propio para no dejar la sesión
// iniciada en el navegador del test.
export async function registerUser(
  baseURL: string,
  user: TestUser,
): Promise<void> {
  const context = await playwrightRequest.newContext({ baseURL });
  const response = await context.post("/api/auth/register", {
    data: {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      password: user.password,
    },
  });
  expect(response.status(), "POST /api/auth/register").toBe(201);
  await context.dispose();
}

// Inicia sesión desde el formulario. Supone que la página ya está en
// #/iniciar-sesion (directamente o por la redirección de una ruta protegida).
export async function fillLoginForm(page: Page, user: TestUser): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
}

export async function loginWithForm(page: Page, user: TestUser): Promise<void> {
  await page.goto("/#/iniciar-sesion");
  await fillLoginForm(page, user);
}

// Inicia sesión por la API con `page.request`, que comparte cookies con el
// navegador: la siguiente vista que cargue la página ya estará autenticada.
export async function loginWithApi(page: Page, user: TestUser): Promise<void> {
  const response = await page.request.post("/api/auth/login", {
    data: { email: user.email, password: user.password },
  });
  expect(response.status(), "POST /api/auth/login").toBe(200);
}

export interface CreatedProduct {
  id: string;
  name: string;
}

// Publica un producto a nombre de `seller` por la API (más rápido que el
// formulario para los casos que no lo prueban).
export async function createProductAs(
  baseURL: string,
  seller: TestUser,
  product: { name: string; price: number; category?: string },
): Promise<CreatedProduct> {
  const context = await playwrightRequest.newContext({ baseURL });
  const login = await context.post("/api/auth/login", {
    data: { email: seller.email, password: seller.password },
  });
  expect(login.status(), "POST /api/auth/login").toBe(200);
  const response = await context.post("/api/products", {
    data: {
      name: product.name,
      description: `Descripción de ${product.name} para los tests E2E.`,
      category: product.category ?? "Tazas",
      price: product.price,
      image: PRODUCT_IMAGE_DATA_URL,
    },
  });
  expect(response.status(), "POST /api/products").toBe(201);
  const body: unknown = await response.json();
  await context.dispose();
  if (
    typeof body !== "object" ||
    body === null ||
    !("id" in body) ||
    typeof body.id !== "string"
  ) {
    throw new Error("La API no devolvió el id del producto creado.");
  }
  return { id: body.id, name: product.name };
}

export function requireBaseURL(baseURL: string | undefined): string {
  if (baseURL === undefined) {
    throw new Error("Falta baseURL en playwright.config.ts.");
  }
  return baseURL;
}

export const STUDENT: TestUser = {
  username: "alumnae2e",
  displayName: "Alumna E2E",
  email: "alumna@uchile.cl",
  password: "clave-alumna-123",
};

export const ADMIN: TestUser = {
  username: "adminpromoe2e",
  displayName: "Administradora E2E",
  email: "adminpromos@e2e.test",
  password: "clave-admin-123",
};

export interface PublicPromotion {
  id: string;
  type: "studentDiscount" | "quantityPack3x2" | "quantityPack2x15";
  label: string;
  active: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error("La API no devolvió un objeto JSON.");
  }
  return value as Record<string, unknown>;
}

function parseDevCode(body: unknown): string {
  const value = asRecord(body).devCode;
  if (typeof value !== "string" || !/^\d{6}$/.test(value)) {
    throw new Error("La API no devolvió un devCode válido.");
  }
  return value;
}

function parseChallengeId(body: unknown): string {
  const value = asRecord(body).challengeId;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("La API no devolvió un challengeId válido.");
  }
  return value;
}

export async function seedPromotions(request: APIRequestContext): Promise<void> {
  const response = await request.post("/api/testing/promotions");
  expect(response.status(), "POST /api/testing/promotions").toBe(204);
}

export async function grantAdmin(
  request: APIRequestContext,
  user: TestUser,
): Promise<void> {
  const response = await request.post(
    `/api/testing/admin?email=${encodeURIComponent(user.email)}`,
  );
  expect(response.status(), "POST /api/testing/admin").toBe(204);
}

export async function getPromotions(page: Page): Promise<PublicPromotion[]> {
  const response: APIResponse = await page.request.get("/api/promotions");
  expect(response.status(), "GET /api/promotions").toBe(200);
  const body: unknown = await response.json();
  expect(Array.isArray(body)).toBe(true);
  return body as PublicPromotion[];
}

export async function requestStudentCode(
  page: Page,
  user: TestUser = STUDENT,
): Promise<string> {
  const response = await page.request.post("/api/students/verify", {
    data: { email: user.email },
  });
  expect(response.status(), "POST /api/students/verify").toBe(202);
  return parseDevCode(await response.json());
}

export async function confirmStudentCode(
  page: Page,
  code: string,
): Promise<void> {
  const response = await page.request.post("/api/students/confirm", {
    data: { code },
  });
  expect(response.status(), "POST /api/students/confirm").toBe(200);
}

export async function verifyStudent(
  page: Page,
  user: TestUser = STUDENT,
): Promise<string> {
  const code = await requestStudentCode(page, user);
  await confirmStudentCode(page, code);
  return code;
}

export async function readDevCodeFromPage(page: Page): Promise<string> {
  const text = await page.getByText(/Código de desarrollo:/).innerText();
  const code = /\d{6}/.exec(text)?.[0];
  if (code === undefined) {
    throw new Error("La interfaz no mostró un devCode de 6 dígitos.");
  }
  return code;
}

export async function readDevCodeFromVerifyResponse(
  page: Page,
  trigger: () => Promise<void>,
): Promise<string> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/students/verify") &&
      response.request().method() === "POST",
  );
  await trigger();
  const response = await responsePromise;
  expect(response.status(), "POST /api/students/verify").toBe(202);
  return parseDevCode(await response.json());
}

export async function logout(page: Page): Promise<void> {
  const response = await page.request.post("/api/auth/logout");
  expect(response.status(), "POST /api/auth/logout").toBe(204);
}

export async function expectSessionStatus(
  page: Page,
  authenticated: boolean,
): Promise<void> {
  const response = await page.request.get("/api/auth/me");
  expect(response.status(), "GET /api/auth/me").toBe(
    authenticated ? 200 : 401,
  );
}

export async function enableMfa(page: Page): Promise<void> {
  const response = await page.request.post("/api/auth/mfa/enable");
  expect(response.status(), "POST /api/auth/mfa/enable").toBe(202);
  const body: unknown = await response.json();
  const confirm = await page.request.post("/api/auth/mfa/enable/confirm", {
    data: { challengeId: parseChallengeId(body), code: parseDevCode(body) },
  });
  expect(confirm.status(), "POST /api/auth/mfa/enable/confirm").toBe(200);
}

export async function disableMfa(page: Page, password: string): Promise<void> {
  const response = await page.request.post("/api/auth/mfa/disable/request");
  expect(response.status(), "POST /api/auth/mfa/disable/request").toBe(202);
  const body: unknown = await response.json();
  const confirm = await page.request.post("/api/auth/mfa/disable", {
    data: {
      challengeId: parseChallengeId(body),
      code: parseDevCode(body),
      password,
    },
  });
  expect(confirm.status(), "POST /api/auth/mfa/disable").toBe(200);
}

export async function startMfaLogin(page: Page, user: TestUser): Promise<void> {
  await loginWithForm(page, user);
  await expect(page).toHaveURL(/#\/verificar-clave$/);
  await expect(page.getByText("Verificar código", { exact: true }).first()).toBeVisible();
  await expectSessionStatus(page, false);
  await expect(
    page.getByRole("navigation", { name: "Accesos de usuario" }),
  ).toHaveCount(0);
}

export async function completeMfaLogin(
  page: Page,
  code: string,
): Promise<void> {
  await page.getByLabel("Código de verificación").fill(code);
  await page.getByRole("button", { name: "Verificar código" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expectSessionStatus(page, true);
}

export async function loginWithMfa(
  page: Page,
  user: TestUser,
): Promise<string> {
  await startMfaLogin(page, user);
  const code = await readDevCodeFromPage(page);
  await completeMfaLogin(page, code);
  return code;
}
