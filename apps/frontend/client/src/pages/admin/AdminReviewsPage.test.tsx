import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AdminReview } from "@tiendadcc/utils";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeAdminPage, makeAdminReview } from "../../logic/adminFixtures.ts";
import { jsonResponse } from "../../test/authMocks.ts";
import { stubApi, type RecordedCall } from "../../test/apiStub.ts";
import { AdminReviewsPage } from "./AdminReviewsPage.tsx";

const LIST = "/api/admin/reviews";

const low = makeAdminReview({
  id: "6713b0c2a1f4e9d2c8b70c01",
  rating: 1,
  comment: "Llegó rota y tardó un mes.",
  author: { id: "u2", username: "beto", displayName: "Beto" },
  product: { id: "6713b0c2a1f4e9d2c8b70a01", name: "Taza DCC" },
  createdAt: "2026-11-12T12:00:00.000Z",
});
const high = makeAdminReview({
  id: "6713b0c2a1f4e9d2c8b70c02",
  rating: 5,
  comment: "Excelente calidad.",
  author: { id: "u3", username: "carla", displayName: "Carla" },
  product: { id: "6713b0c2a1f4e9d2c8b70a02", name: "Polera meme" },
  createdAt: "2026-11-10T12:00:00.000Z",
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
}

function renderPage(initial = "/admin/resenas") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="/admin/resenas"
          element={
            <>
              <AdminReviewsPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function listCalls(calls: RecordedCall[]) {
  return calls.filter((call) => call.method === "GET" && call.url.startsWith(LIST));
}

function search() {
  return screen.getByTestId("search").textContent;
}

function cardOf(text: string): HTMLElement {
  return screen.getByText(text).closest("article") as HTMLElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminReviewsPage / datos", () => {
  it("shows every review as a card with product, stars, comment, author and date", async () => {
    stubApi(null, (method, url) =>
      method === "GET" && url === LIST
        ? jsonResponse(200, makeAdminPage([low, high]))
        : undefined,
    );
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Reseñas" }),
    ).toBeDefined();
    expect(screen.getByText("Cargando reseñas…").getAttribute("aria-busy")).toBe(
      "true",
    );

    const card = (await screen.findByText("Excelente calidad.")).closest(
      "article",
    ) as HTMLElement;
    const link = within(card).getByRole("link", { name: "Polera meme" });
    expect(link.getAttribute("href")).toBe("/producto/6713b0c2a1f4e9d2c8b70a02");
    expect(link.querySelector("img")?.getAttribute("src")).toBe(
      "/api/products/6713b0c2a1f4e9d2c8b70a02/image",
    );
    expect(within(card).getByRole("img", { name: "5 de 5 estrellas" })).toBeDefined();
    expect(within(card).getByText("@carla").className).toContain("font-mono");
    expect(within(card).getByText("10 nov 2026")).toBeDefined();
  });

  it("marks reviews of 1–2 stars with an amber border and the 'baja' badge", async () => {
    stubApi(null, () => jsonResponse(200, makeAdminPage([low, high])));
    renderPage();

    const lowCard = (await screen.findByText("Llegó rota y tardó un mes.")).closest(
      "article",
    ) as HTMLElement;
    expect(lowCard.className).toContain("border-destructive");
    expect(within(lowCard).getByText("baja")).toBeDefined();
    expect(within(lowCard).getByRole("img", { name: "1 de 5 estrellas" })).toBeDefined();

    const highCard = cardOf("Excelente calidad.");
    expect(highCard.className).not.toContain("border-destructive");
    expect(within(highCard).queryByText("baja")).toBeNull();
  });

  it("shows the range, the pagination, the empty text and the error", async () => {
    stubApi(null, () =>
      jsonResponse(200, makeAdminPage([low], { total: 45, pagina: 2, totalPaginas: 3 })),
    );
    renderPage("/admin/resenas?pagina=2");

    expect(await screen.findByText("Mostrando 21–40 de 45")).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeDefined();
  });

  it("shows the empty text", async () => {
    stubApi(null, () => jsonResponse(200, makeAdminPage<AdminReview>([])));
    renderPage();

    expect(await screen.findByText("No hay reseñas con este filtro.")).toBeDefined();
  });

  it("shows the error with Reintentar", async () => {
    let fail = true;
    const calls = stubApi(null, () =>
      fail
        ? jsonResponse(500, { message: "No se pudieron cargar las reseñas." })
        : jsonResponse(200, makeAdminPage([low])),
    );
    renderPage();

    expect(await screen.findByText("No se pudieron cargar las reseñas.")).toBeDefined();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Llegó rota y tardó un mes.")).toBeDefined();
    expect(listCalls(calls)).toHaveLength(2);
  });
});

describe("AdminReviewsPage / filtros en la URL", () => {
  it("restores rating and order from the URL and sends them to the API", async () => {
    const calls = stubApi(null, () => jsonResponse(200, makeAdminPage([low])));
    renderPage("/admin/resenas?calificacion=bajas&orden=menor&pagina=2");

    await screen.findByText("Llegó rota y tardó un mes.");
    expect(
      screen
        .getByRole("button", { name: "1–2 estrellas" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Todas" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect((screen.getByLabelText("Ordenar") as HTMLSelectElement).value).toBe("menor");
    expect(listCalls(calls)[0]?.url).toBe(
      `${LIST}?calificacion=bajas&orden=menor&pagina=2`,
    );
  });

  it("offers Todas, 1–2 estrellas and 4–5 estrellas and writes the choice to the URL", async () => {
    const calls = stubApi(null, () =>
      jsonResponse(200, makeAdminPage([low], { pagina: 2, totalPaginas: 3, total: 45 })),
    );
    renderPage("/admin/resenas?pagina=2");
    await screen.findByText("Llegó rota y tardó un mes.");

    const group = screen.getByRole("group", { name: "Calificación" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Todas", "1–2 estrellas", "4–5 estrellas"]);

    fireEvent.click(within(group).getByRole("button", { name: "4–5 estrellas" }));

    await waitFor(() => expect(search()).toBe("?calificacion=altas"));
    await waitFor(() =>
      expect(listCalls(calls).at(-1)?.url).toBe(`${LIST}?calificacion=altas`),
    );
    fireEvent.click(within(group).getByRole("button", { name: "Todas" }));
    await waitFor(() => expect(search()).toBe(""));
  });

  it("offers Más recientes and Menor calificación and writes the order to the URL", async () => {
    const calls = stubApi(null, () => jsonResponse(200, makeAdminPage([low])));
    renderPage();
    await screen.findByText("Llegó rota y tardó un mes.");

    const select = screen.getByLabelText("Ordenar") as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual([
      "Más recientes",
      "Menor calificación",
    ]);
    fireEvent.change(select, { target: { value: "menor" } });

    await waitFor(() => expect(search()).toBe("?orden=menor"));
    await waitFor(() =>
      expect(listCalls(calls).at(-1)?.url).toBe(`${LIST}?orden=menor`),
    );
  });
});

describe("AdminReviewsPage / eliminar", () => {
  it("confirms with the text of the spec, deletes and shows the notice", async () => {
    let remaining: AdminReview[] = [low, high];
    const calls = stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage(remaining));
      }
      if (method === "DELETE" && url === `${LIST}/${low.id}`) {
        remaining = [high];
        return new Response(null, { status: 204 });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Eliminar reseña de @beto sobre «Taza DCC»",
      }),
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Eliminar reseña")).toBeDefined();
    expect(
      within(dialog).getByText(
        "Se borrará la reseña de @beto sobre «Taza DCC». No se puede deshacer.",
      ),
    ).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Reseña eliminada.")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("✓ ok");
    await waitFor(() =>
      expect(screen.queryByText("Llegó rota y tardó un mes.")).toBeNull(),
    );
    expect(screen.getByText("Excelente calidad.")).toBeDefined();
    expect(calls.some((call) => call.method === "DELETE")).toBe(true);
  });

  it("does not delete when the dialog is cancelled", async () => {
    const calls = stubApi(null, () => jsonResponse(200, makeAdminPage([low])));
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Eliminar reseña de @beto sobre «Taza DCC»",
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    expect(screen.getByText("Llegó rota y tardó un mes.")).toBeDefined();
  });

  it("shows the API error and keeps the card when the deletion fails", async () => {
    stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage([low]));
      }
      if (method === "DELETE") {
        return jsonResponse(500, { message: "No se pudo eliminar la reseña." });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Eliminar reseña de @beto sobre «Taza DCC»",
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText("No se pudo eliminar la reseña.")).toBeDefined();
    expect(screen.getByText("Llegó rota y tardó un mes.")).toBeDefined();
  });

  it("reloads the list on a 404", async () => {
    const calls = stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage([low]));
      }
      if (method === "DELETE") {
        return jsonResponse(404, { message: "Reseña no encontrada." });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Eliminar reseña de @beto sobre «Taza DCC»",
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Reseña no encontrada.")).toBeDefined();
    await waitFor(() => expect(listCalls(calls)).toHaveLength(2));
  });

  it("goes back a page when deleting the last review of the last page", async () => {
    let deleted = false;
    const calls = stubApi(null, (method, url) => {
      if (method === "GET" && url.startsWith(LIST)) {
        return deleted
          ? jsonResponse(200, makeAdminPage([high], { pagina: 1, totalPaginas: 1, total: 20 }))
          : jsonResponse(200, makeAdminPage([low], { pagina: 2, totalPaginas: 2, total: 21 }));
      }
      if (method === "DELETE") {
        deleted = true;
        return new Response(null, { status: 204 });
      }
      return undefined;
    });
    renderPage("/admin/resenas?pagina=2");

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Eliminar reseña de @beto sobre «Taza DCC»",
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Excelente calidad.")).toBeDefined();
    await waitFor(() => expect(search()).toBe(""));
    expect(listCalls(calls).at(-1)?.url).toBe(`${LIST}?pagina=2`);
  });
});
