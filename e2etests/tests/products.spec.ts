import { expect, test } from "@playwright/test";
import {
  createProductAs,
  loginWithApi,
  PRODUCT_IMAGE_PATH,
  registerUser,
  requireBaseURL,
  resetDatabase,
  SELLER,
} from "./helpers.ts";

// Caso mínimo 2 del Hito 3: CRUD sobre la entidad principal, las
// publicaciones de productos (spec 016, RF-5).
test.describe("CRUD de publicaciones", () => {
  test.beforeEach(async ({ page, request, baseURL }) => {
    await resetDatabase(request);
    await registerUser(requireBaseURL(baseURL), SELLER);
    await loginWithApi(page, SELLER);
  });

  test("crea una publicación desde el formulario y la lista", async ({
    page,
  }) => {
    await page.goto("/#/publicar");
    await expect(
      page.getByRole("heading", { name: "Publicar producto" }),
    ).toBeVisible();

    await page.getByLabel("Nombre", { exact: true }).fill("Taza E2E");
    await page
      .getByLabel("Descripción")
      .fill("Taza creada por Playwright para probar el flujo completo.");
    await page.getByLabel("Categoría").selectOption("Tazas");
    await page.getByLabel("Precio (CLP)").fill("7500");
    await page.getByLabel("Imagen").setInputFiles(PRODUCT_IMAGE_PATH);
    await expect(page.getByRole("img", { name: /vista previa/i })).toBeVisible();
    await page.getByRole("button", { name: "Publicar", exact: true }).click();

    // Listar: aparece en "Mis publicaciones" con el aviso de publicación.
    await expect(page).toHaveURL(/#\/mis-publicaciones$/);
    await expect(page.getByText("Tu producto se publicó.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Taza E2E", exact: true }),
    ).toBeVisible();

    // ...y en el catálogo público.
    await page.goto("/#/catalogo");
    await expect(
      page.getByRole("heading", { name: "Taza E2E", exact: true }),
    ).toBeVisible();
  });

  test("edita una publicación propia", async ({ page, baseURL }) => {
    const product = await createProductAs(requireBaseURL(baseURL), SELLER, {
      name: "Polera E2E",
      price: 12000,
      category: "Poleras",
    });

    await page.goto("/#/mis-publicaciones");
    await page.getByRole("link", { name: `Editar ${product.name}` }).click();

    await expect(page).toHaveURL(
      new RegExp(`#/publicaciones/${product.id}/editar$`),
    );
    await expect(
      page.getByRole("heading", { name: "Editar publicación" }),
    ).toBeVisible();
    const nameField = page.getByLabel("Nombre", { exact: true });
    await expect(nameField).toHaveValue(product.name);
    await nameField.fill("Polera E2E edición limitada");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page).toHaveURL(/#\/mis-publicaciones$/);
    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Polera E2E edición limitada",
        exact: true,
      }),
    ).toBeVisible();

    await page.goto(`/#/producto/${product.id}`);
    await expect(
      page.getByRole("heading", { name: "Polera E2E edición limitada" }),
    ).toBeVisible();
  });

  test("elimina una publicación tras confirmar", async ({ page, baseURL }) => {
    const product = await createProductAs(requireBaseURL(baseURL), SELLER, {
      name: "Sticker E2E",
      price: 1500,
      category: "Stickers",
    });

    await page.goto("/#/mis-publicaciones");
    await expect(
      page.getByRole("heading", { name: product.name, exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: `Eliminar ${product.name}` }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(product.name);
    await dialog.getByRole("button", { name: "Eliminar", exact: true }).click();

    await expect(page.getByText("Publicación eliminada.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: product.name, exact: true }),
    ).toHaveCount(0);

    await page.goto(`/#/producto/${product.id}`);
    await expect(
      page.getByRole("heading", { name: product.name }),
    ).toHaveCount(0);
  });

  test("cancelar la confirmación no elimina la publicación", async ({
    page,
    baseURL,
  }) => {
    const product = await createProductAs(requireBaseURL(baseURL), SELLER, {
      name: "Pin E2E",
      price: 2000,
      category: "Pins",
    });

    await page.goto("/#/mis-publicaciones");
    await page.getByRole("button", { name: `Eliminar ${product.name}` }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancelar" })
      .click();

    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: product.name, exact: true }),
    ).toBeVisible();
  });
});
