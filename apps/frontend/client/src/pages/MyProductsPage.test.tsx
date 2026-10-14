import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App.tsx";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { makeProduct } from "../logic/productFixtures.ts";
import { PUBLISHED_NOTICE, noticeState } from "../logic/publicationNotice.ts";
import { jsonResponse } from "../test/authMocks.ts";
import { stubApi, testUser } from "../test/apiStub.ts";
import { MyProductsPage } from "./MyProductsPage.tsx";

const mine = [
  makeProduct({ id: "p1", name: "Taza mía", price: 5990 }),
  makeProduct({ id: "p2", name: "Polera mía", category: "Poleras", price: 12000 }),
];

function renderPage(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/mis-publicaciones", state }]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/mis-publicaciones" element={<MyProductsPage />} />
            <Route path="/publicar" element={<p>Publicar (sonda)</p>} />
            <Route path="/publicaciones/:id/editar" element={<p>Editar (sonda)</p>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MyProductsPage", () => {
  it("lists own products with edit and delete actions", async () => {
    stubApi(testUser, (method, url) =>
      method === "GET" && url === "/api/products/mine"
        ? jsonResponse(200, mine)
        : undefined,
    );
    renderPage();
    expect(screen.getByText("Cargando publicaciones…")).toBeDefined();
    expect(await screen.findByText("Taza mía")).toBeDefined();
    expect(screen.getByText("Polera mía")).toBeDefined();
    expect(screen.getByText("$5.990")).toBeDefined();
    const edit = screen.getByRole("link", { name: "Editar Taza mía" });
    expect(edit.getAttribute("href")).toBe("/publicaciones/p1/editar");
    expect(screen.getByRole("button", { name: "Eliminar Taza mía" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Publicar producto" })).toBeDefined();
    // Own products are managed, not bought: no cart or favorite buttons.
    expect(screen.queryByRole("button", { name: /al carrito/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /favoritos/ })).toBeNull();
  });

  it("shows the empty state with a link to publish", async () => {
    stubApi(testUser, () => jsonResponse(200, []));
    renderPage();
    expect(await screen.findByText("Aún no publicas productos.")).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Publicar producto" })).toHaveLength(2);
  });

  it("shows an error and retries", async () => {
    let attempt = 0;
    stubApi(testUser, (_method, url) => {
      if (url !== "/api/products/mine") return undefined;
      attempt += 1;
      return attempt === 1
        ? jsonResponse(500, { message: "Falla" })
        : jsonResponse(200, mine);
    });
    renderPage();
    expect(await screen.findByText("No se pudieron cargar tus publicaciones.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Taza mía")).toBeDefined();
  });

  it("shows the arrival notice once as a status", async () => {
    stubApi(testUser, () => jsonResponse(200, mine));
    renderPage(noticeState(PUBLISHED_NOTICE));
    const notice = await screen.findByText(/Tu producto se publicó\./);
    expect(notice.closest('[role="status"]')).not.toBeNull();
    await screen.findByText("Taza mía");
    // The history entry was cleared, so the notice does not come back.
    await waitFor(() => {
      expect(screen.getByText(/Tu producto se publicó\./)).toBeDefined();
    });
  });
});

describe("delete flow", () => {
  function setup(deleteResponse: () => Response) {
    return stubApi(testUser, (method, url) => {
      if (method === "GET" && url === "/api/products/mine") {
        return jsonResponse(200, mine);
      }
      if (method === "DELETE" && url === "/api/products/p1") {
        return deleteResponse();
      }
      return undefined;
    });
  }

  it("cancel closes the dialog without deleting and returns the focus", async () => {
    const calls = setup(() => new Response(null, { status: 204 }));
    renderPage();
    const trigger = await screen.findByRole("button", { name: "Eliminar Taza mía" });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("¿Eliminar «Taza mía»? Esta acción no se puede deshacer.")).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    expect(screen.getByText("Taza mía")).toBeDefined();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("Escape closes the dialog and returns the focus", async () => {
    setup(() => new Response(null, { status: 204 }));
    renderPage();
    const trigger = await screen.findByRole("button", { name: "Eliminar Taza mía" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("moves the focus into the dialog", async () => {
    setup(() => new Response(null, { status: 204 }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar Taza mía" }));
    const dialog = await screen.findByRole("alertdialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("confirming deletes once, removes the product and announces it", async () => {
    let finish: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const calls = stubApi(testUser, (method, url) => {
      if (method === "GET" && url === "/api/products/mine") {
        return jsonResponse(200, mine);
      }
      if (method === "DELETE" && url === "/api/products/p1") {
        return pending;
      }
      return undefined;
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar Taza mía" }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Eliminar" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    const busy = await within(dialog).findByRole("button", { name: "Eliminando…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    finish(new Response(null, { status: 204 }));

    await waitFor(() => expect(screen.queryByText("Taza mía")).toBeNull());
    expect(screen.getByText(/Publicación eliminada\./).closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText("Polera mía")).toBeDefined();
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
  });

  it("keeps the product and shows the error when deleting fails", async () => {
    setup(() => jsonResponse(403, { message: "No puedes eliminar esta publicación." }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar Taza mía" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No puedes eliminar esta publicación.")).toBeDefined();
    expect(screen.getByText("Taza mía")).toBeDefined();
    expect(screen.queryByText(/Publicación eliminada\./)).toBeNull();
  });
});

describe("route protection", () => {
  it("redirects anonymous visitors to login", async () => {
    stubApi(null, () => undefined);
    render(
      <MemoryRouter initialEntries={["/mis-publicaciones"]}>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeDefined();
  });
});
