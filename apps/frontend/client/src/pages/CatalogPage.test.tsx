import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogPage } from "./CatalogPage.tsx";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import {
  jsonResponse,
  stubAuthFetch,
  type FetchRoutes,
} from "../test/authMocks.ts";
import { exampleProducts, productRoutes } from "../test/productMocks.ts";
import { makeProduct } from "../logic/productFixtures.ts";

// Exposes the current location and a "back" action, so the tests can check
// the URL and the history without a real browser.
function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">
        {location.pathname}
        {location.search}
      </output>
      <button type="button" onClick={() => navigate(-1)}>
        Atrás (sonda)
      </button>
    </>
  );
}

function renderCatalog(initialEntries: string[]) {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      initialIndex={initialEntries.length - 1}
    >
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<p>Inicio (sonda)</p>} />
            <Route path="/catalogo" element={<CatalogPage />} />
          </Routes>
          <LocationProbe />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

let routes: FetchRoutes;

beforeEach(() => {
  routes = stubAuthFetch(productRoutes());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function currentLocation(): string {
  return screen.getByTestId("location").textContent ?? "";
}

function filterButton(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

function productCardCount(): number {
  return screen
    .getAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/producto/"))
    .length;
}

// Like productCardCount but returns 0 when there are no product links.
function productCardCountSafe(): number {
  return screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/producto/"))
    .length;
}

function catalogRequests(): number {
  return vi
    .mocked(globalThis.fetch)
    .mock.calls.filter(([url]) => String(url) === "/api/products").length;
}

describe("CatalogPage category param", () => {
  it("selects the category given in ?categoria", async () => {
    renderCatalog(["/catalogo?categoria=tazas"]);
    expect(filterButton("Tazas").getAttribute("aria-pressed")).toBe("true");
    expect(filterButton("Todas").getAttribute("aria-pressed")).toBe("false");
    await waitFor(() => {
      expect(productCardCount()).toBe(1);
    });
  });

  it("falls back to Todas for an unknown category", async () => {
    renderCatalog(["/catalogo?categoria=gorros"]);
    expect(filterButton("Todas").getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => {
      expect(productCardCount()).toBe(3);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("writes the slug when choosing a category and removes it for Todas", async () => {
    renderCatalog(["/catalogo"]);
    await screen.findByText("Taza DCC");

    fireEvent.click(filterButton("Tazas"));
    expect(currentLocation()).toBe("/catalogo?categoria=tazas");
    expect(filterButton("Tazas").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(filterButton("Todas"));
    expect(currentLocation()).toBe("/catalogo");
    expect(filterButton("Todas").getAttribute("aria-pressed")).toBe("true");
  });

  it("does not add history entries when changing the filter", async () => {
    renderCatalog(["/", "/catalogo"]);
    await screen.findByText("Taza DCC");

    fireEvent.click(filterButton("Tazas"));
    fireEvent.click(filterButton("Poleras"));
    fireEvent.click(filterButton("Stickers"));
    expect(currentLocation()).toBe("/catalogo?categoria=stickers");

    fireEvent.click(screen.getByRole("button", { name: "Atrás (sonda)" }));
    expect(currentLocation()).toBe("/");
    expect(screen.getByText("Inicio (sonda)")).toBeDefined();
  });
});

describe("CatalogPage data loading", () => {
  it("shows the filters and a loading status while the catalog loads", async () => {
    routes["/api/products"] = () => new Promise<Response>(() => {});
    renderCatalog(["/catalogo"]);

    // The location probe is an <output> (implicit role "status"), so the
    // loading message is looked up by text.
    expect(screen.getByText("Cargando productos…").getAttribute("role")).toBe(
      "status",
    );
    expect(filterButton("Todas")).toBeDefined();
    expect(filterButton("Tazas")).toBeDefined();
    expect(filterButton("Poleras")).toBeDefined();
    expect(filterButton("Stickers")).toBeDefined();
    expect(productCardCountSafe()).toBe(0);
  });

  it("shows every API product and requests the catalog only once", async () => {
    renderCatalog(["/catalogo"]);

    await waitFor(() => {
      expect(productCardCount()).toBe(exampleProducts.length);
    });
    expect(screen.queryByText("Cargando productos…")).toBeNull();
    expect(catalogRequests()).toBe(1);
  });

  it("filters locally: changing category does not request again", async () => {
    renderCatalog(["/catalogo"]);
    await screen.findByText("Taza DCC");

    fireEvent.click(filterButton("Poleras"));
    expect(screen.getByText("Polera DCC")).toBeDefined();
    expect(screen.queryByText("Taza DCC")).toBeNull();
    fireEvent.click(filterButton("Todas"));
    expect(screen.getByText("Taza DCC")).toBeDefined();

    expect(catalogRequests()).toBe(1);
  });

  it("shows the empty message for a category without products", async () => {
    routes["/api/products"] = () =>
      jsonResponse(200, [makeProduct({ id: "a", name: "Solo taza" })]);
    renderCatalog(["/catalogo?categoria=poleras"]);

    expect(
      await screen.findByText("No hay productos en esta categoría."),
    ).toBeDefined();
    expect(productCardCountSafe()).toBe(0);
  });

  it("shows an error with Reintentar and recovers on retry", async () => {
    routes["/api/products"] = () =>
      jsonResponse(500, { message: "Falla del servidor" });
    renderCatalog(["/catalogo"]);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No se pudieron cargar los productos.");
    expect(filterButton("Tazas")).toBeDefined();

    routes["/api/products"] = () => jsonResponse(200, exampleProducts);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Taza DCC")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("treats a network failure as the error state", async () => {
    routes["/api/products"] = () => Promise.reject(new TypeError("offline"));
    renderCatalog(["/catalogo"]);

    expect(await screen.findByRole("alert")).toBeDefined();
  });
});
