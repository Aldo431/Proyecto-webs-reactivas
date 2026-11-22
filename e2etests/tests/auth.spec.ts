import { expect, test } from "@playwright/test";
import {
  BUYER,
  fillLoginForm,
  loginWithApi,
  loginWithForm,
  registerUser,
  requireBaseURL,
  resetDatabase,
} from "./helpers.ts";

// Caso mínimo 1 del Hito 3: login + acceso protegido (spec 016, RF-4).
// También deja evidencia ejecutable del ruteo: redirecciones, recarga (F5) y
// botones atrás/adelante del navegador.
test.describe("Login y rutas protegidas", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetDatabase(request);
    await registerUser(requireBaseURL(baseURL), BUYER);
  });

  test("un visitante que abre una ruta protegida es enviado al login", async ({
    page,
  }) => {
    await page.goto("/#/perfil");

    await expect(page).toHaveURL(/#\/iniciar-sesion$/);
    await expect(
      page.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeVisible();
  });

  test("tras iniciar sesión vuelve a la ruta protegida y la sesión sobrevive a F5", async ({
    page,
  }) => {
    await page.goto("/#/perfil");
    await expect(page).toHaveURL(/#\/iniciar-sesion$/);

    await fillLoginForm(page, BUYER);

    await expect(page).toHaveURL(/#\/perfil$/);
    await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
    await expect(page.getByText(BUYER.displayName).first()).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/#\/perfil$/);
    await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
  });

  test("con una contraseña incorrecta muestra el error y sigue en el login", async ({
    page,
  }) => {
    await page.goto("/#/iniciar-sesion");

    await fillLoginForm(page, { ...BUYER, password: "contraseña-equivocada" });

    await expect(page.getByRole("alert")).toContainText(
      "Correo o contraseña incorrectos.",
    );
    await expect(page).toHaveURL(/#\/iniciar-sesion$/);
  });

  test("los botones atrás y adelante muestran la vista de cada URL", async ({
    page,
  }) => {
    await loginWithApi(page, BUYER);
    await page.goto("/#/catalogo");
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    await page.goto("/#/perfil");
    await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/#\/catalogo$/);
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/#\/perfil$/);
    await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
  });

  test("un usuario con sesión no vuelve a ver el formulario de login", async ({
    page,
  }) => {
    await loginWithForm(page, BUYER);
    await expect(page).toHaveURL(/#\/$/);
    // Espera a que el inicio muestre la sesión antes de volver a navegar.
    await expect(
      page.getByRole("navigation", { name: "Accesos de usuario" }),
    ).toBeVisible();

    await page.goto("/#/iniciar-sesion");

    await expect(page).toHaveURL(/#\/$/);
  });

  test("al cerrar sesión la ruta protegida vuelve a exigir login", async ({
    page,
  }) => {
    await loginWithApi(page, BUYER);
    await page.goto("/#/");

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(
      page.getByRole("navigation", { name: "Accesos principales" }),
    ).toBeVisible();

    await page.goto("/#/perfil");
    await expect(page).toHaveURL(/#\/iniciar-sesion$/);
  });

  test("un usuario sin rol de administrador no entra al panel /admin", async ({
    page,
  }) => {
    await loginWithApi(page, BUYER);

    await page.goto("/#/admin");

    await expect(page).toHaveURL(/#\/$/);
  });
});
