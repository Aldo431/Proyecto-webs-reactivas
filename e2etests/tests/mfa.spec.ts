import { expect, test } from "@playwright/test";
import {
  BUYER,
  completeMfaLogin,
  enableMfa,
  expectSessionStatus,
  fillLoginForm,
  loginWithApi,
  loginWithMfa,
  logout,
  readDevCodeFromPage,
  registerUser,
  requireBaseURL,
  resetDatabase,
  startMfaLogin,
} from "./helpers.ts";

test.describe("Verificación en dos pasos por correo", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetDatabase(request);
    await registerUser(requireBaseURL(baseURL), BUYER);
  });

  test("se activa desde el perfil usando el devCode de la API", async ({
    page,
  }) => {
    await loginWithApi(page, BUYER);
    await page.goto("/#/perfil");
    await expect(
      page.getByText("Verificación en dos pasos", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Desactivada", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();
    const code = await readDevCodeFromPage(page);
    await page.getByLabel("Código de verificación").fill(code);
    await page.getByRole("button", { name: "Confirmar activación" }).click();

    await expect(page.getByText("Activada", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Verificación en dos pasos activada correctamente."),
    ).toBeVisible();
    const me = await page.request.get("/api/auth/me");
    expect(me.status(), "GET /api/auth/me").toBe(200);
    expect(await me.json()).toMatchObject({ mfaEnabled: true });
  });

  test("el login pide un segundo paso, reenvía el código y rechaza uno inválido", async ({
    page,
  }) => {
    await loginWithApi(page, BUYER);
    await enableMfa(page);
    await logout(page);

    await startMfaLogin(page, BUYER);
    const firstCode = await readDevCodeFromPage(page);
    const wrongCode = firstCode === "000000" ? "111111" : "000000";
    await page.getByLabel("Código de verificación").fill(wrongCode);
    await page.getByRole("button", { name: "Verificar código" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "El código de verificación es inválido o ha expirado.",
    );
    await expect(page).toHaveURL(/#\/verificar-clave$/);
    await expectSessionStatus(page, false);

    await page.getByRole("button", { name: "Reenviar código" }).click();
    await expect(
      page.getByText("Enviamos un nuevo código de verificación a tu correo."),
    ).toBeVisible();
    const resentCode = await readDevCodeFromPage(page);
    await completeMfaLogin(page, resentCode);
    await expect(
      page.getByRole("navigation", { name: "Accesos de usuario" }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/verificar-clave/);
  });

  test("se desactiva con contraseña y el usuario vuelve a entrar en un paso", async ({
    browser,
    page,
    baseURL,
  }) => {
    await loginWithApi(page, BUYER);
    await enableMfa(page);
    await logout(page);
    await loginWithMfa(page, BUYER);

    await page.goto("/#/perfil");
    await page.getByRole("button", { name: "Desactivar verificación en dos pasos" }).click();
    const code = await readDevCodeFromPage(page);
    await page.getByLabel("Código de verificación").fill(code);
    await page.getByLabel("Contraseña actual").fill("clave-incorrecta");
    await page.getByRole("button", { name: "Confirmar desactivación" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "La contraseña actual es incorrecta.",
    );
    await expect(page.getByText("Activada", { exact: true })).toBeVisible();

    await page.getByLabel("Contraseña actual").fill(BUYER.password);
    await page.getByRole("button", { name: "Confirmar desactivación" }).click();
    await expect(page.getByText("Desactivada", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Verificación en dos pasos desactivada correctamente."),
    ).toBeVisible();

    const me = await page.request.get("/api/auth/me");
    expect(await me.json()).toMatchObject({ mfaEnabled: false });

    const anonymousContext = await browser.newContext({
      baseURL: requireBaseURL(baseURL),
    });
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto("/#/iniciar-sesion");
    await fillLoginForm(anonymousPage, BUYER);
    await expect(anonymousPage).toHaveURL(/#\/$/);
    await expectSessionStatus(anonymousPage, true);
    await expect(
      anonymousPage.getByRole("navigation", { name: "Accesos de usuario" }),
    ).toBeVisible();
    await anonymousContext.close();
  });
});
