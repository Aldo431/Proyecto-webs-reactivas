import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  ADMIN,
  BUYER,
  createProductAs,
  getPromotions,
  grantAdmin,
  loginWithApi,
  readDevCodeFromVerifyResponse,
  registerUser,
  requireBaseURL,
  resetDatabase,
  SELLER,
  seedPromotions,
  STUDENT,
  verifyStudent,
  type CreatedProduct,
  type TestUser,
} from "./helpers.ts";

const PRICE = 10000;

async function addToCart(
  page: Page,
  product: CreatedProduct,
  quantity: number,
): Promise<Locator> {
  await page.goto(`/#/producto/${product.id}`);
  await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  const drawer = page.getByRole("dialog", { name: "Tu carrito" });
  await expect(drawer).toBeVisible();
  for (let added = 1; added < quantity; added += 1) {
    await drawer
      .getByRole("button", { name: `Aumentar cantidad de ${product.name}` })
      .click();
  }
  await expect(drawer.getByLabel(`Cantidad: ${quantity}`)).toBeVisible();
  return drawer;
}

async function expectSummary(
  scope: Locator,
  savings: string,
  total: string,
): Promise<void> {
  await expect(scope.getByText("Ahorro", { exact: true }).locator("..")).toContainText(
    savings,
  );
  await expect(scope.getByText("Total", { exact: true }).locator("..")).toContainText(
    total,
  );
}

test.describe("Promociones y cuenta de alumno", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    await resetDatabase(request);
    await seedPromotions(request);
    const base = requireBaseURL(baseURL);
    await registerUser(base, SELLER);
    await registerUser(base, BUYER);
  });

  test("verifica al alumno con correo ug.uchile.cl y aplica el 20% en carrito, checkout y pedido", async ({
    page,
    baseURL,
  }) => {
    const base = requireBaseURL(baseURL);
    const student: TestUser = {
      ...STUDENT,
      username: "alumnacarro",
      email: "alumnacarro@ug.uchile.cl",
    };
    const product = await createProductAs(base, SELLER, {
      name: "Taza alumno E2E",
      price: PRICE,
    });
    await registerUser(base, student);
    await loginWithApi(page, student);

    await page.goto("/#/perfil");
    const studentSection = page
      .getByRole("region", { name: "Cuenta de alumno" })
      .first();
    await expect(studentSection).toContainText("Sin verificar");
    const code = await readDevCodeFromVerifyResponse(page, async () => {
      await studentSection
        .getByRole("button", { name: "Enviar código a mi correo" })
        .click();
    });
    await expect(page.getByText(/Código de desarrollo:/)).toHaveCount(0);
    await studentSection.getByLabel("Código de verificación").fill(code);
    await studentSection.getByRole("button", { name: "Confirmar código" }).click();
    await expect(studentSection).toContainText("Alumno verificado");
    await expect(
      studentSection.getByText("Tu descuento de alumno está activo."),
    ).toBeVisible();

    const drawer = await addToCart(page, product, 1);
    await expect(drawer).toContainText(product.name);
    await expectSummary(drawer, "$2.000", "$8.000");

    await drawer
      .getByRole("button", { name: `Aumentar cantidad de ${product.name}` })
      .click();
    await expectSummary(drawer, "$4.000", "$16.000");
    await drawer
      .getByRole("button", { name: `Disminuir cantidad de ${product.name}` })
      .click();
    await expectSummary(drawer, "$2.000", "$8.000");

    await drawer.getByRole("button", { name: "Finalizar compra" }).click();
    await expect(
      page.getByRole("heading", { name: "Pago", exact: true }),
    ).toBeVisible();
    const summary = page.getByRole("region", { name: "Resumen de compra" });
    await expectSummary(summary, "$2.000", "$8.000");

    await page.getByLabel("Número de tarjeta").fill("4111111111111111");
    await page.getByLabel("Vencimiento (MM/AA)").fill("12/30");
    await page.getByLabel("CVC").fill("123");
    await page.getByLabel("Nombre del titular").fill(student.displayName);
    await page.getByRole("button", { name: "Pagar $8.000" }).click();

    await expect(
      page.getByRole("heading", { name: "¡Compra realizada con éxito!" }),
    ).toBeVisible();
    await expect(page.getByText("Tu compra por")).toContainText("$8.000");
    const orders = await page.request.get("/api/orders");
    expect(orders.status(), "GET /api/orders").toBe(200);
    expect((await orders.json())[0]).toMatchObject({ total: 8000 });
  });

  test("el 20% desaparece al cambiar el correo por uno que no es institucional", async ({
    page,
    baseURL,
  }) => {
    const base = requireBaseURL(baseURL);
    const student: TestUser = {
      ...STUDENT,
      username: "alumnacambio",
      email: "alumnacambio@uchile.cl",
    };
    const product = await createProductAs(base, SELLER, {
      name: "Taza cambio de correo E2E",
      price: PRICE,
    });
    await registerUser(base, student);
    await loginWithApi(page, student);
    await verifyStudent(page, student);

    const drawer = await addToCart(page, product, 1);
    await expectSummary(drawer, "$2.000", "$8.000");
    await drawer.getByRole("button", { name: "Cerrar carrito" }).click();

    await page.goto("/#/perfil");
    const studentSection = page
      .getByRole("region", { name: "Cuenta de alumno" })
      .first();
    await expect(studentSection).toContainText("Alumno verificado");
    await page.getByRole("button", { name: "Editar perfil" }).click();
    await page
      .getByLabel("Correo electrónico")
      .fill("alumnacambio@ejemplo.test");
    await page.getByLabel("Contraseña actual").fill(student.password);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Perfil actualizado correctamente.")).toBeVisible();
    await expect(studentSection).toContainText("Sin verificar");
    await expect(
      studentSection.getByText(
        "La verificación requiere un correo institucional de la U. de Chile.",
      ),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Carrito, 1 artículos" })
      .click();
    const updatedDrawer = page.getByRole("dialog", { name: "Tu carrito" });
    await expectSummary(updatedDrawer, "$0", "$10.000");
  });

  test("los packs 3x2 y 2x15% se aplican sin acumularse", async ({
    page,
    baseURL,
  }) => {
    const product = await createProductAs(requireBaseURL(baseURL), SELLER, {
      name: "Polera pack E2E",
      price: PRICE,
    });
    await loginWithApi(page, BUYER);

    const drawer = await addToCart(page, product, 2);
    await expectSummary(drawer, "$3.000", "$17.000");
    await drawer
      .getByRole("button", { name: `Aumentar cantidad de ${product.name}` })
      .click();
    await expectSummary(drawer, "$10.000", "$20.000");

    const response = await page.request.post("/api/pricing/quote", {
      data: { items: [{ productId: product.id, quantity: 3 }] },
    });
    expect(response.status(), "POST /api/pricing/quote").toBe(200);
    const quote = (await response.json()) as {
      discounts: { type: string }[];
      savings: number;
    };
    expect(quote.discounts).toHaveLength(1);
    expect(quote.discounts[0]).toMatchObject({ type: "quantityPack3x2" });
    expect(quote.savings).toBe(10000);
  });

  test("un administrador desactiva y reactiva una promoción vigente", async ({
    page,
    request,
    baseURL,
  }) => {
    const base = requireBaseURL(baseURL);
    await registerUser(base, ADMIN);
    await grantAdmin(request, ADMIN);
    await loginWithApi(page, ADMIN);

    const initial = await getPromotions(page);
    expect(initial).toHaveLength(3);
    const pack = initial.find(
      (promotion) => promotion.type === "quantityPack2x15",
    );
    expect(pack).toBeDefined();
    if (pack === undefined) return;

    const body = {
      type: pack.type,
      label: pack.label,
      active: false,
      percent: 15,
    };
    const deactivate = await page.request.patch(`/api/promotions/${pack.id}`, {
      data: body,
    });
    expect(deactivate.status(), "PATCH /api/promotions/:id").toBe(200);
    expect(
      (await getPromotions(page)).find((promotion) => promotion.id === pack.id),
    ).toBeUndefined();

    const reactivate = await page.request.patch(`/api/promotions/${pack.id}`, {
      data: { ...body, active: true },
    });
    expect(reactivate.status(), "PATCH /api/promotions/:id").toBe(200);
    expect(
      (await getPromotions(page)).find((promotion) => promotion.id === pack.id),
    ).toMatchObject({ active: true });

    const remove = await page.request.delete(`/api/promotions/${pack.id}`);
    expect(remove.status(), "DELETE /api/promotions/:id").toBe(200);
    expect(await getPromotions(page)).toHaveLength(2);
  });
});
