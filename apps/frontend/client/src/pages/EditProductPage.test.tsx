import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App.tsx";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import type { ProcessImageResult } from "../logic/imageProcessing.ts";
import { makeProduct } from "../logic/productFixtures.ts";
import { jsonResponse } from "../test/authMocks.ts";
import { stubApi, testUser } from "../test/apiStub.ts";
import { EditProductPage } from "./EditProductPage.tsx";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";

const own = makeProduct({
  id: "p1",
  name: "Taza mía",
  description: "Descripción original.",
  price: 5990,
  image: "/api/products/p1/image?v=1",
  seller: { id: testUser.id, username: "tiendadcc", displayName: "TiendaDCC" },
});

const processOk = vi.fn(
  (): Promise<ProcessImageResult> => Promise.resolve({ ok: true, dataUrl: PNG }),
);

function renderEdit(path = "/publicaciones/p1/editar") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route
              path="/publicaciones/:id/editar"
              element={<EditProductPage processImage={processOk} />}
            />
            <Route path="/mis-publicaciones" element={<p>Mis publicaciones (sonda)</p>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function productHandler(product = own) {
  return (method: string, url: string) =>
    method === "GET" && url === `/api/products/${product.id}`
      ? jsonResponse(200, product)
      : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
  processOk.mockClear();
});

describe("EditProductPage", () => {
  it("prefills the form with the current data and image", async () => {
    stubApi(testUser, productHandler());
    renderEdit();
    expect(((await screen.findByLabelText("Nombre")) as HTMLInputElement).value).toBe("Taza mía");
    expect((screen.getByLabelText("Descripción") as HTMLTextAreaElement).value).toBe("Descripción original.");
    expect((screen.getByLabelText("Categoría") as HTMLSelectElement).value).toBe("Tazas");
    expect((screen.getByLabelText("Precio (CLP)") as HTMLInputElement).value).toBe("5990");
    expect(screen.getByAltText("Vista previa de la imagen").getAttribute("src")).toBe(
      "/api/products/p1/image?v=1",
    );
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDefined();
  });

  it("saves without sending the image when it was not changed", async () => {
    const calls = stubApi(testUser, (method, url) => {
      if (method === "PATCH" && url === "/api/products/p1") {
        return jsonResponse(200, { ...own, price: 7000 });
      }
      return productHandler()(method, url);
    });
    renderEdit();
    fireEvent.change(await screen.findByLabelText("Precio (CLP)"), { target: { value: "7000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Mis publicaciones (sonda)")).toBeDefined();
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch?.body).toEqual({ price: 7000 });
  });

  it("sends the new image when it was replaced", async () => {
    const calls = stubApi(testUser, (method, url) => {
      if (method === "PATCH") return jsonResponse(200, own);
      return productHandler()(method, url);
    });
    renderEdit();
    await screen.findByLabelText("Nombre");
    fireEvent.change(screen.getByLabelText("Imagen"), {
      target: { files: [new File(["x"], "n.png", { type: "image/png" })] },
    });
    await waitFor(() =>
      expect(screen.getByAltText("Vista previa de la imagen").getAttribute("src")).toBe(PNG),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText("Mis publicaciones (sonda)");
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ image: PNG });
  });

  it("asks for a change when nothing was modified", async () => {
    const calls = stubApi(testUser, productHandler());
    renderEdit();
    await screen.findByLabelText("Nombre");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("No hay cambios para guardar.")).toBeDefined();
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
  });

  it("keeps the data and shows the backend 400 on a field", async () => {
    stubApi(testUser, (method, url) => {
      if (method === "PATCH") {
        return jsonResponse(400, {
          message: "Revisa los datos ingresados.",
          fieldErrors: { name: "Ya tienes un producto con ese nombre." },
        });
      }
      return productHandler()(method, url);
    });
    renderEdit();
    fireEvent.change(await screen.findByLabelText("Nombre"), { target: { value: "Otro" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Ya tienes un producto con ese nombre.")).toBeDefined();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Otro");
  });

  it("shows a clear message when the product does not exist", async () => {
    stubApi(testUser, (method, url) =>
      method === "GET" && url === "/api/products/nope"
        ? jsonResponse(404, { message: "Producto no encontrado." })
        : undefined,
    );
    renderEdit("/publicaciones/nope/editar");
    expect(await screen.findByText("Producto no encontrado.")).toBeDefined();
    expect(screen.queryByLabelText("Nombre")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Mis publicaciones" }).length).toBeGreaterThan(0);
  });

  it("blocks users who are not the owner", async () => {
    stubApi(testUser, productHandler(makeProduct({ id: "p1", name: "Ajena" })));
    renderEdit();
    expect(await screen.findByText("No puedes editar esta publicación.")).toBeDefined();
    expect(screen.queryByLabelText("Nombre")).toBeNull();
  });

  it("shows a load error with retry", async () => {
    let attempt = 0;
    stubApi(testUser, (method, url) => {
      if (method !== "GET" || url !== "/api/products/p1") return undefined;
      attempt += 1;
      return attempt === 1 ? jsonResponse(500, { message: "Falla" }) : jsonResponse(200, own);
    });
    renderEdit();
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByLabelText("Nombre")).toBeDefined();
  });

  it("redirects anonymous visitors to login", async () => {
    stubApi(null, () => undefined);
    render(
      <MemoryRouter initialEntries={["/publicaciones/p1/editar"]}>
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
