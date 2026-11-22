import { expect, test } from "@playwright/test";
import {
  BUYER,
  createProductAs,
  fillLoginForm,
  registerUser,
  requireBaseURL,
  resetDatabase,
  SELLER,
} from "./helpers.ts";

// Flujo del carrito, que vive en el store global de Zustand (spec 015) y se
// sincroniza con la cuenta (spec 016, RF-6).
test.describe("Carrito con estado global", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetDatabase(request);
    await registerUser(requireBaseURL(baseURL), SELLER);
    await registerUser(requireBaseURL(baseURL), BUYER);
  });

  test("el carrito invitado se conserva al iniciar sesión y tras recargar", async ({
    page,
    baseURL,
  }) => {
    const product = await createProductAs(requireBaseURL(baseURL), SELLER, {
      name: "Taza carrito E2E",
      price: 6000,
    });

    // Como invitado agrega el producto: el panel del carrito lo muestra.
    await page.goto(`/#/producto/${product.id}`);
    await expect(
      page.getByRole("heading", { name: product.name }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    const drawer = page.getByRole("dialog", { name: "Tu carrito" });
    await expect(drawer).toContainText(product.name);
    await drawer.getByRole("button", { name: "Cerrar carrito" }).click();
    await expect(
      page.getByRole("button", { name: "Carrito, 1 artículos" }),
    ).toBeVisible();

    // Al iniciar sesión el carrito se conserva y se sube a la cuenta.
    await page.goto("/#/iniciar-sesion");
    await fillLoginForm(page, BUYER);
    await expect(page).toHaveURL(/#\/$/);
    await expect(
      page.getByRole("button", { name: "Carrito, 1 artículos" }),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const response = await page.request.get("/api/users/me");
        const profile = (await response.json()) as {
          cart: { productId: string; quantity: number }[];
        };
        return profile.cart;
      })
      .toEqual([expect.objectContaining({ productId: product.id, quantity: 1 })]);

    // La recarga restaura sesión y carrito sin duplicar cantidades.
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Carrito, 1 artículos" }),
    ).toBeVisible();
  });
});
