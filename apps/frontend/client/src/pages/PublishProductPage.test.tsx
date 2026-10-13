import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CreateProductInput } from "@tiendadcc/utils";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App.tsx";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { ProductForm, type ProductSubmitResult } from "../components/ProductForm.tsx";
import type { ProcessImageResult } from "../logic/imageProcessing.ts";
import { PublishProductPage } from "./PublishProductPage.tsx";
import { makeProduct } from "../logic/productFixtures.ts";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { productRoutes } from "../test/productMocks.ts";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";

type Processor = (file: File) => Promise<ProcessImageResult>;

const processOk = vi.fn<Processor>(() =>
  Promise.resolve({ ok: true, dataUrl: PNG }),
);

function renderPublish() {
  return render(
    <MemoryRouter initialEntries={["/publicar"]}>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function pickFile(label = "Imagen", type = "image/png") {
  const file = new File(["x"], "foto.png", { type });
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
}

function fillText() {
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Taza nueva" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Una taza." } });
  fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Tazas" } });
  fireEvent.change(screen.getByLabelText("Precio (CLP)"), { target: { value: "5990" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  processOk.mockClear();
});

describe("/publicar route", () => {
  it("redirects anonymous visitors to login", async () => {
    stubAuthFetch(productRoutes());
    renderPublish();
    expect(
      await screen.findByRole("heading", { name: "Iniciar sesión" }),
    ).toBeDefined();
  });

  it("shows the form to authenticated users", async () => {
    stubAuthFetch({
      ...productRoutes(),
      "/api/auth/me": () => jsonResponse(200, okUser),
    });
    renderPublish();
    expect(
      await screen.findByRole("heading", { name: "Publicar producto" }),
    ).toBeDefined();
    for (const label of ["Nombre", "Descripción", "Categoría", "Precio (CLP)", "Imagen"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
    expect(screen.getByText("0/1000")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Mis publicaciones" }).getAttribute("aria-current"),
    ).toBe("page");
  });
});

describe("ProductForm", () => {
  function renderForm(
    onSubmit = vi.fn<(input: CreateProductInput) => Promise<ProductSubmitResult>>(
      () => Promise.resolve({ ok: true }),
    ),
    processImage: Processor = processOk,
  ) {
    render(
      <ProductForm
        mode="create"
        submitLabel="Publicar"
        submittingLabel="Publicando…"
        onSubmit={onSubmit}
        processImage={processImage}
      />,
    );
    return onSubmit;
  }

  it("shows per-field errors, focuses the first and does not submit", () => {
    const onSubmit = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    const name = screen.getByLabelText("Nombre");
    expect(document.activeElement).toBe(name);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    const describedBy = name.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe(
      "El nombre es obligatorio.",
    );
    expect(screen.getByText("La imagen es obligatoria.")).toBeDefined();
    expect(screen.getByText("Selecciona una categoría válida.")).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the preview and the change button after choosing an image", async () => {
    renderForm();
    pickFile();
    expect(screen.getByText("Procesando imagen…")).toBeDefined();
    expect(
      (screen.getByRole("button", { name: "Publicar" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    const preview = await screen.findByAltText("Vista previa de la imagen");
    expect(preview.getAttribute("src")).toBe(PNG);
    expect(screen.getByRole("button", { name: "Cambiar imagen" })).toBeDefined();
    expect(screen.queryByText("Procesando imagen…")).toBeNull();
  });

  it("shows the image processing error", async () => {
    renderForm(undefined, () =>
      Promise.resolve({
        ok: false,
        message: "Formato de imagen no permitido. Usa JPG, PNG o WebP.",
      }),
    );
    pickFile("Imagen", "image/gif");
    expect(
      await screen.findByText("Formato de imagen no permitido. Usa JPG, PNG o WebP."),
    ).toBeDefined();
  });

  it("submits the validated input once and blocks double submits", async () => {
    let resolve: (value: ProductSubmitResult) => void = () => {};
    const onSubmit = vi.fn(
      (_input: CreateProductInput) =>
        new Promise<ProductSubmitResult>((r) => { resolve = r; }),
    );
    renderForm(onSubmit);
    fillText();
    pickFile();
    await screen.findByAltText("Vista previa de la imagen");

    const button = screen.getByRole("button", { name: "Publicar" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "Publicando…" })).toBeDefined();
    expect(
      (screen.getByRole("button", { name: "Publicando…" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Taza nueva",
      description: "Una taza.",
      category: "Tazas",
      price: 5990,
      image: PNG,
    });
    resolve({ ok: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Publicar" })).toBeDefined();
    });
  });

  it("maps backend field errors without losing data", async () => {
    const onSubmit = vi.fn((_input: CreateProductInput) =>
      Promise.resolve<ProductSubmitResult>({
        ok: false,
        message: "Revisa los datos ingresados.",
        fieldErrors: { name: "Ya tienes un producto con ese nombre." },
      }),
    );
    renderForm(onSubmit);
    fillText();
    pickFile();
    await screen.findByAltText("Vista previa de la imagen");
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect(await screen.findByText("Ya tienes un producto con ese nombre.")).toBeDefined();
    expect(screen.getByText("Revisa los datos ingresados.")).toBeDefined();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Taza nueva");
    expect(screen.getByAltText("Vista previa de la imagen")).toBeDefined();
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("Nombre"));
    });
  });
});

describe("PublishProductPage submit", () => {
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/publicar"]}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route
                path="/publicar"
                element={<PublishProductPage processImage={processOk} />}
              />
              <Route path="/mis-publicaciones" element={<p>Mis publicaciones (sonda)</p>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it("creates the product and navigates to Mis publicaciones", async () => {
    const created = makeProduct({ id: "nuevo-1", name: "Taza nueva" });
    const routes = stubAuthFetch({
      ...productRoutes(),
      "/api/auth/me": () => jsonResponse(200, okUser),
      "/api/products": () => jsonResponse(201, created),
    });
    renderPage();
    await screen.findByLabelText("Nombre");
    fillText();
    pickFile();
    await screen.findByAltText("Vista previa de la imagen");
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect(await screen.findByText("Mis publicaciones (sonda)")).toBeDefined();
    const calls = vi.mocked(fetch).mock.calls.filter(
      ([url]) => String(url) === "/api/products",
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]?.method).toBe("POST");
    void routes;
  });

  it("keeps the data and shows the backend 400 message", async () => {
    stubAuthFetch({
      ...productRoutes(),
      "/api/auth/me": () => jsonResponse(200, okUser),
      "/api/products": () =>
        jsonResponse(400, {
          message: "Revisa los datos ingresados.",
          fieldErrors: { price: "El precio debe ser mayor a cero." },
        }),
    });
    renderPage();
    await screen.findByLabelText("Nombre");
    fillText();
    pickFile();
    await screen.findByAltText("Vista previa de la imagen");
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect(await screen.findByText("El precio debe ser mayor a cero.")).toBeDefined();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Taza nueva");
    expect(screen.queryByText("Mis publicaciones (sonda)")).toBeNull();
  });
});
