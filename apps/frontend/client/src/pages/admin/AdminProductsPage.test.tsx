import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AdminProduct } from "@tiendadcc/utils";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeAdminPage, makeAdminProduct } from "../../logic/adminFixtures.ts";
import { jsonResponse } from "../../test/authMocks.ts";
import { stubApi, type RecordedCall } from "../../test/apiStub.ts";
import { AdminProductsPage } from "./AdminProductsPage.tsx";

const LIST = "/api/admin/products";

const taza = makeAdminProduct({
  id: "6713b0c2a1f4e9d2c8b70a01",
  name: "Taza DCC",
  category: "Tazas",
  price: 6000,
  featured: false,
  seller: { id: "u1", username: "ana", displayName: "Ana" },
  createdAt: "2026-11-10T12:00:00.000Z",
  reviewCount: 3,
  averageRating: 4.3,
});
const polera = makeAdminProduct({
  id: "6713b0c2a1f4e9d2c8b70a02",
  name: "Polera meme",
  category: "Poleras",
  price: 12000,
  featured: true,
  seller: { id: "u2", username: "beto", displayName: "Beto" },
  createdAt: "2026-11-12T12:00:00.000Z",
  reviewCount: 0,
  averageRating: null,
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
}

function renderPage(initial = "/admin/productos") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="/admin/productos"
          element={
            <>
              <AdminProductsPage />
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminProductsPage / datos", () => {
  it("shows the loading text and then every product with its columns", async () => {
    stubApi(null, (method, url) =>
      method === "GET" && url === LIST
        ? jsonResponse(200, makeAdminPage([taza, polera]))
        : undefined,
    );
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Productos" }),
    ).toBeDefined();
    expect(screen.getByText("Cargando productos…").getAttribute("aria-busy")).toBe(
      "true",
    );

    const row = (await screen.findByText("Taza DCC")).closest("tr") as HTMLElement;
    expect(within(row).getByText("Tazas")).toBeDefined();
    expect(within(row).getByText("@ana").className).toContain("font-mono");
    expect(within(row).getByText("$6.000").className).toContain("font-mono");
    expect(within(row).getByText(/★ 4,3/)).toBeDefined();
    expect(within(row).getByText("(3)")).toBeDefined();
    expect(
      within(row).getByText("4,3 de 5 estrellas, 3 reseñas").className,
    ).toContain("sr-only");
    expect(within(row).getByText("10 nov 2026")).toBeDefined();
    expect(
      within(row).getByRole("switch", { name: "Destacar «Taza DCC»" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      within(row).getByRole("link", { name: "Ver Taza DCC" }).getAttribute("href"),
    ).toBe(`/producto/${taza.id}`);

    const other = screen.getByText("Polera meme").closest("tr") as HTMLElement;
    expect(within(other).getByText("—")).toBeDefined();
    expect(
      within(other).getByRole("switch").getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("keeps the table inside a scrollable container and shows the range", async () => {
    stubApi(null, () => jsonResponse(200, makeAdminPage([taza], { total: 45, pagina: 2, totalPaginas: 3 })));
    renderPage("/admin/productos?pagina=2");

    const table = await screen.findByRole("table");
    expect(table.parentElement?.className).toContain("overflow-x-auto");
    expect(screen.getByText("Mostrando 21–40 de 45")).toBeDefined();
  });

  it("shows the empty text", async () => {
    stubApi(null, () => jsonResponse(200, makeAdminPage<AdminProduct>([])));
    renderPage();

    expect(
      await screen.findByText("No hay productos que coincidan con los filtros."),
    ).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the error with Reintentar", async () => {
    let fail = true;
    const calls = stubApi(null, () =>
      fail
        ? jsonResponse(500, { message: "No se pudieron cargar los productos." })
        : jsonResponse(200, makeAdminPage([taza])),
    );
    renderPage();

    expect(
      await screen.findByText("No se pudieron cargar los productos."),
    ).toBeDefined();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Taza DCC")).toBeDefined();
    expect(listCalls(calls)).toHaveLength(2);
  });
});

describe("AdminProductsPage / filtros en la URL", () => {
  it("restores every filter from the URL and sends them to the API", async () => {
    const calls = stubApi(null, () => jsonResponse(200, makeAdminPage([taza])));
    renderPage("/admin/productos?q=taza&categoria=Tazas&destacados=true&pagina=2");

    await screen.findByText("Taza DCC");
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("taza");
    expect((screen.getByLabelText("Categoría") as HTMLSelectElement).value).toBe(
      "Tazas",
    );
    expect(
      screen.getByRole("button", { name: "Destacados" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(listCalls(calls)[0]?.url).toBe(
      `${LIST}?q=taza&categoria=Tazas&destacados=true&pagina=2`,
    );
  });

  it("changing a filter goes back to page 1", async () => {
    const calls = stubApi(null, () => jsonResponse(200, makeAdminPage([taza], { pagina: 2, totalPaginas: 3, total: 45 })));
    renderPage("/admin/productos?pagina=2");
    await screen.findByText("Taza DCC");

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "Poleras" },
    });

    await waitFor(() => expect(search()).toBe("?categoria=Poleras"));
    await waitFor(() =>
      expect(listCalls(calls).at(-1)?.url).toBe(`${LIST}?categoria=Poleras`),
    );
  });

  it("the Destacados button filters and Todos clears it", async () => {
    const calls = stubApi(null, () => jsonResponse(200, makeAdminPage([polera])));
    renderPage();
    await screen.findByText("Polera meme");

    fireEvent.click(screen.getByRole("button", { name: "Destacados" }));
    await waitFor(() => expect(search()).toBe("?destacados=true"));
    expect(
      screen.getByRole("button", { name: "Destacados" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    await waitFor(() => expect(search()).toBe(""));
    expect(listCalls(calls).at(-1)?.url).toBe(LIST);
  });

  it("typing in the search box updates the URL after a pause", async () => {
    const calls = stubApi(null, () => jsonResponse(200, makeAdminPage([taza])));
    renderPage("/admin/productos?pagina=3");
    await screen.findByText("Taza DCC");
    const requests = listCalls(calls).length;

    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "polerón" },
    });

    expect(listCalls(calls)).toHaveLength(requests);
    await waitFor(() => expect(search()).toBe("?q=poler%C3%B3n"), {
      timeout: 2000,
    });
    await waitFor(() =>
      expect(listCalls(calls).at(-1)?.url).toBe(`${LIST}?q=poler%C3%B3n`),
    );
  });

  it("paginates with the Siguiente button", async () => {
    const calls = stubApi(null, (_method, url) =>
      url.includes("pagina=3")
        ? jsonResponse(200, makeAdminPage([polera], { pagina: 3, totalPaginas: 3, total: 45 }))
        : jsonResponse(200, makeAdminPage([taza], { pagina: 2, totalPaginas: 3, total: 45 })),
    );
    renderPage("/admin/productos?pagina=2");
    await screen.findByText("Taza DCC");

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Polera meme")).toBeDefined();
    expect(search()).toBe("?pagina=3");
    expect(screen.getByText("Mostrando 41–45 de 45")).toBeDefined();
    expect(listCalls(calls).at(-1)?.url).toBe(`${LIST}?pagina=3`);
  });

  it("goes back a page when the API adjusts it, without asking twice", async () => {
    const calls = stubApi(null, () =>
      jsonResponse(200, makeAdminPage([taza], { pagina: 2, totalPaginas: 2, total: 21 })),
    );
    renderPage("/admin/productos?pagina=5");

    await screen.findByText("Taza DCC");
    await waitFor(() => expect(search()).toBe("?pagina=2"));

    expect(listCalls(calls)).toHaveLength(1);
  });
});

describe("AdminProductsPage / destacar", () => {
  it("disables the switch while it answers and then shows the notice", async () => {
    let answer!: (response: Response) => void;
    const calls = stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage([taza]));
      }
      if (method === "PATCH") {
        return new Promise<Response>((resolve) => {
          answer = resolve;
        });
      }
      return undefined;
    });
    renderPage();
    const toggle = await screen.findByRole("switch", { name: "Destacar «Taza DCC»" });

    fireEvent.click(toggle);

    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(true));
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch?.url).toBe(`${LIST}/${taza.id}/featured`);
    expect(patch?.body).toEqual({ featured: true });

    answer(jsonResponse(200, { ...taza, featured: true }));

    expect(
      await screen.findByText("«Taza DCC» ahora aparece en Destacados del inicio."),
    ).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("✓ ok");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect((toggle as HTMLButtonElement).disabled).toBe(false);
  });

  it("announces when a product stops being featured", async () => {
    stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage([polera]));
      }
      if (method === "PATCH") {
        return jsonResponse(200, { ...polera, featured: false });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(await screen.findByRole("switch", { name: "Destacar «Polera meme»" }));

    expect(await screen.findByText("«Polera meme» ya no está destacado.")).toBeDefined();
  });

  it("keeps the previous state and shows the error when it fails", async () => {
    stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage([taza]));
      }
      if (method === "PATCH") {
        return jsonResponse(500, { message: "No se pudo cambiar el destacado." });
      }
      return undefined;
    });
    renderPage();
    const toggle = await screen.findByRole("switch");

    fireEvent.click(toggle);

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText("No se pudo cambiar el destacado.")).toBeDefined();
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect((toggle as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows 'Producto no encontrado.' and reloads on a 404", async () => {
    const calls = stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage([taza]));
      }
      if (method === "PATCH") {
        return jsonResponse(404, { message: "Producto no encontrado." });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(await screen.findByRole("switch"));

    expect(await screen.findByText("Producto no encontrado.")).toBeDefined();
    await waitFor(() => expect(listCalls(calls)).toHaveLength(2));
  });

  it("reloads the list when featuring under the Destacados filter", async () => {
    const calls = stubApi(null, (method, url) => {
      if (method === "GET" && url.startsWith(LIST)) {
        return jsonResponse(200, makeAdminPage([polera]));
      }
      if (method === "PATCH") {
        return jsonResponse(200, { ...polera, featured: false });
      }
      return undefined;
    });
    renderPage("/admin/productos?destacados=true");

    fireEvent.click(await screen.findByRole("switch"));

    await screen.findByText("«Polera meme» ya no está destacado.");
    await waitFor(() => expect(listCalls(calls)).toHaveLength(2));
  });
});

describe("AdminProductsPage / eliminar", () => {
  it("confirms with the seller and consequences, deletes and shows the notice", async () => {
    let remaining: AdminProduct[] = [taza, polera];
    const calls = stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage(remaining));
      }
      if (method === "DELETE" && url === `${LIST}/${taza.id}`) {
        remaining = [polera];
        return new Response(null, { status: 204 });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar Taza DCC" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Eliminar publicación")).toBeDefined();
    const text = dialog.textContent ?? "";
    expect(text).toContain("«Taza DCC»");
    expect(text).toContain("@ana");
    expect(text).toContain("catálogo");
    expect(text).toContain("también se borrarán sus reseñas");

    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Publicación eliminada.")).toBeDefined();
    await waitFor(() => expect(screen.queryByText("Taza DCC")).toBeNull());
    expect(screen.getByText("Polera meme")).toBeDefined();
    expect(calls.some((call) => call.method === "DELETE")).toBe(true);
  });

  it("does not delete when the dialog is cancelled", async () => {
    const calls = stubApi(null, () => jsonResponse(200, makeAdminPage([taza])));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar Taza DCC" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    expect(screen.getByText("Taza DCC")).toBeDefined();
  });

  it("shows the API error when the deletion fails", async () => {
    stubApi(null, (method, url) => {
      if (method === "GET" && url === LIST) {
        return jsonResponse(200, makeAdminPage([taza]));
      }
      if (method === "DELETE") {
        return jsonResponse(500, { message: "No se pudo eliminar la publicación." });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar Taza DCC" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No se pudo eliminar la publicación.")).toBeDefined();
    expect(screen.getByText("Taza DCC")).toBeDefined();
  });
});
