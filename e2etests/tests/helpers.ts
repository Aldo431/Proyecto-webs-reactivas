import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  expect,
  request as playwrightRequest,
  type APIRequestContext,
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
