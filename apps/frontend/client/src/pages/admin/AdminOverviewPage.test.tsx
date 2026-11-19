import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeAdminOverview, makeAdminReview } from "../../logic/adminFixtures.ts";
import { makeProduct } from "../../logic/productFixtures.ts";
import { jsonResponse, stubAuthFetch } from "../../test/authMocks.ts";
import { AdminOverviewPage } from "./AdminOverviewPage.tsx";

const OVERVIEW_URL = "/api/admin/overview";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function fullOverview() {
  return makeAdminOverview({
    users: { total: 27, newLast7Days: 5, admins: 2 },
    products: {
      total: 12,
      featured: 3,
      byCategory: [
        { category: "Tazas", count: 4 },
        { category: "Poleras", count: 2 },
        { category: "Stickers", count: 0 },
        { category: "Pins", count: 1 },
      ],
    },
    reviews: { total: 18, newLast7Days: 0, averageRating: 4.2, lowLast7Days: 1 },
    activity: [
      {
        type: "review_created",
        at: hoursAgo(2),
        user: { username: "beto" },
        product: { id: "p1", name: "Taza DCC" },
        rating: 1,
      },
      {
        type: "product_published",
        at: hoursAgo(5),
        user: { username: "ana" },
        product: { id: "p2", name: "Polera meme" },
      },
      { type: "user_registered", at: hoursAgo(30), user: { username: "carla" } },
    ],
    latestProducts: [
      makeProduct({
        id: "p2",
        name: "Polera meme",
        category: "Poleras",
        price: 12000,
        seller: { id: "u1", username: "ana", displayName: "Ana" },
        createdAt: "2026-11-10T12:00:00.000Z",
      }),
    ],
    lowReviews: [
      makeAdminReview({
        id: "r1",
        rating: 1,
        comment: "Llegó rota.",
        author: { id: "u2", username: "beto", displayName: "Beto" },
        product: { id: "p1", name: "Taza DCC" },
        createdAt: hoursAgo(2),
      }),
    ],
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/admin" element={<AdminOverviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminOverviewPage", () => {
  it("shows the terminal nod, the title and the loading text while it loads", () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => new Promise<Response>(() => {}) });
    renderPage();

    expect(screen.getByText(/sudo tiendadcc --resumen/)).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 1, name: "Resumen" }),
    ).toBeDefined();
    const loading = screen.getByText("Cargando resumen…");
    expect(loading.getAttribute("aria-busy")).toBe("true");
    expect(
      (screen.getByRole("button", { name: "Actualizar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("shows the four indicators with their notes", async () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => jsonResponse(200, fullOverview()) });
    renderPage();

    expect(await screen.findByText("Usuarios registrados")).toBeDefined();
    const values = Object.fromEntries(
      ["Usuarios registrados", "Productos publicados", "Reseñas", "Calificación promedio"].map(
        (label) => {
          const term = screen.getByText(label);
          const card = term.parentElement as HTMLElement;
          return [label, within(card).getAllByText(/.+/).map((e) => e.textContent)];
        },
      ),
    );
    expect(values["Usuarios registrados"]).toEqual([
      "Usuarios registrados",
      "27",
      "+5 esta semana",
    ]);
    expect(values["Productos publicados"]).toEqual([
      "Productos publicados",
      "12",
      "3 destacados",
    ]);
    expect(values["Reseñas"]).toEqual(["Reseñas", "18", "+0 esta semana"]);
    expect(values["Calificación promedio"]).toEqual([
      "Calificación promedio",
      "4,2",
      "de 5 estrellas",
    ]);
  });

  it("highlights +N in green only when N > 0", async () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => jsonResponse(200, fullOverview()) });
    renderPage();

    expect(
      (await screen.findByText("+5 esta semana")).className,
    ).toContain("text-terminal-success");
    expect(screen.getByText("+0 esta semana").className).not.toContain(
      "text-terminal-success",
    );
  });

  it("shows the empty rating without reviews", async () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => jsonResponse(200, makeAdminOverview()) });
    renderPage();

    expect(await screen.findByText("sin reseñas aún")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.getByText("Aún no hay actividad.")).toBeDefined();
    expect(
      screen.getByText("No hay reseñas con calificación baja esta semana."),
    ).toBeDefined();
  });

  it("draws the category bars with a full aria-label and proportional widths", async () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => jsonResponse(200, fullOverview()) });
    renderPage();

    const chart = await screen.findByRole("img", {
      name: "Productos por categoría: Tazas 4, Poleras 2, Stickers 0, Pins 1.",
    });
    expect(chart).toBeDefined();
    expect(screen.getByTestId("bar-Tazas").style.width).toBe("100%");
    expect(screen.getByTestId("bar-Poleras").style.width).toBe("50%");
    expect(screen.getByTestId("bar-Stickers").style.width).toBe("0%");
    expect(screen.getByTestId("bar-Pins").style.width).toBe("25%");
  });

  it("lists the recent activity with relative times", async () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => jsonResponse(200, fullOverview()) });
    renderPage();

    await screen.findByText("Actividad reciente");
    const activity = screen
      .getByRole("heading", { name: "Actividad reciente" })
      .closest("[data-slot=card]") as HTMLElement;
    const items = within(activity).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "@beto dejó una reseña de 1 estrella en «Taza DCC»hace 2 h",
      "@ana publicó «Polera meme»hace 5 h",
      "@carla creó su cuentaayer",
    ]);
    expect(within(items[0] as HTMLElement).getByText("@beto").className).toContain(
      "font-mono",
    );
  });

  it("shows the latest products with CLP price and a link to all", async () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => jsonResponse(200, fullOverview()) });
    renderPage();

    const table = await screen.findByRole("table");
    const row = within(table).getByText("Polera meme").closest("tr") as HTMLElement;
    expect(within(row).getByText("Poleras")).toBeDefined();
    expect(within(row).getByText("@ana").className).toContain("font-mono");
    expect(within(row).getByText("$12.000")).toBeDefined();
    expect(within(row).getByText("10 nov 2026")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Ver todas →" }).getAttribute("href"),
    ).toBe("/admin/productos");
  });

  it("scrolls the table inside its own container", async () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => jsonResponse(200, fullOverview()) });
    renderPage();

    const table = await screen.findByRole("table");
    expect(table.parentElement?.className).toContain("overflow-x-auto");
  });

  it("shows the low reviews with amber border and a link to moderation", async () => {
    stubAuthFetch({ [OVERVIEW_URL]: () => jsonResponse(200, fullOverview()) });
    renderPage();

    const card = (await screen.findByText("Llegó rota.")).closest(
      "article",
    ) as HTMLElement;
    expect(card.className).toContain("border-destructive");
    // Un comentario sin espacios (una URL) no debe ensanchar la página.
    expect(within(card).getByText("Llegó rota.").className).toContain("break-words");
    expect(within(card).getByText("Taza DCC")).toBeDefined();
    expect(within(card).getByRole("img", { name: "1 de 5 estrellas" })).toBeDefined();
    expect(within(card).getByText("@beto")).toBeDefined();
    expect(within(card).getByText("hace 2 h")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Ir a moderación →" }).getAttribute("href"),
    ).toBe("/admin/resenas");
  });

  it("shows the error with Reintentar and loads again", async () => {
    const routes = stubAuthFetch({
      [OVERVIEW_URL]: () =>
        jsonResponse(500, { message: "No se pudo cargar el resumen." }),
    });
    renderPage();

    expect(await screen.findByText("No se pudo cargar el resumen.")).toBeDefined();
    routes[OVERVIEW_URL] = () => jsonResponse(200, fullOverview());
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Usuarios registrados")).toBeDefined();
    expect(screen.queryByText("No se pudo cargar el resumen.")).toBeNull();
  });

  it("offers going back to the store when the account lost the role (403)", async () => {
    stubAuthFetch({
      [OVERVIEW_URL]: () =>
        jsonResponse(403, {
          message: "Solo un administrador puede realizar esta acción.",
        }),
    });
    renderPage();

    expect(
      await screen.findByText("Solo un administrador puede realizar esta acción."),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Volver a la tienda" }).getAttribute("href"),
    ).toBe("/");
  });

  it("Actualizar asks for the data again and keeps the content visible", async () => {
    let users = 27;
    const routes = stubAuthFetch({});
    const handler = vi.fn(() =>
      jsonResponse(
        200,
        makeAdminOverview({ users: { total: users, newLast7Days: 0, admins: 1 } }),
      ),
    );
    routes[OVERVIEW_URL] = handler;
    renderPage();
    expect(await screen.findByText("27")).toBeDefined();

    users = 28;
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    // Mientras responde, el contenido anterior sigue visible.
    expect(screen.getByText("Usuarios registrados")).toBeDefined();
    await waitFor(() => expect(screen.getByText("28")).toBeDefined());
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("asks for the data again when the page is visited again", async () => {
    const routes = stubAuthFetch({
      [OVERVIEW_URL]: () => jsonResponse(200, makeAdminOverview()),
    });
    const handler = vi.fn(routes[OVERVIEW_URL]);
    routes[OVERVIEW_URL] = handler;
    const first = renderPage();
    await screen.findByText("Usuarios registrados");
    first.unmount();

    renderPage();
    await screen.findByText("Usuarios registrados");

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
