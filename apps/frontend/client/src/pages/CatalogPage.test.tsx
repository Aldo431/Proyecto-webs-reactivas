import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Product } from "@tiendadcc/utils";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogPage } from "./CatalogPage.tsx";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { jsonResponse } from "../test/authMocks.ts";
import { exampleProducts } from "../test/productMocks.ts";

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

// Tiny fake of GET /api/products with the 009 semantics: exact category,
// case-insensitive name substring, min/max, the four orders and pages of 9.
function fakeCatalogPage(url: string, products: Product[]): Response {
  const query = new URL(url, "http://test").searchParams;
  let list = [...products];
  const categoria = query.get("categoria");
  if (categoria !== null) {
    list = list.filter((product) => product.category === categoria);
  }
  const q = query.get("q");
  if (q !== null && q !== "") {
    list = list.filter((product) =>
      product.name.toLowerCase().includes(q.toLowerCase()),
    );
  }
  const min = query.get("min");
  if (min !== null) {
    list = list.filter((product) => product.price >= Number(min));
  }
  const max = query.get("max");
  if (max !== null) {
    list = list.filter((product) => product.price <= Number(max));
  }
  const orden = query.get("orden") ?? "recientes";
  if (orden === "precio-menor") {
    list.sort((a, b) => a.price - b.price);
  } else if (orden === "precio-mayor") {
    list.sort((a, b) => b.price - a.price);
  } else if (orden === "nombre") {
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  const pagina = Number(query.get("pagina") ?? "1");
  const porPagina = 9;
  const total = list.length;
  const totalPaginas = Math.ceil(total / porPagina);
  return jsonResponse(200, {
    products: list.slice((pagina - 1) * porPagina, pagina * porPagina),
    total,
    pagina,
    porPagina,
    totalPaginas,
  });
}

function stubCatalog(products: Product[] = exampleProducts) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/me") {
        return Promise.resolve(
          jsonResponse(401, { message: "Debes iniciar sesión." }),
        );
      }
      if (url.startsWith("/api/products")) {
        return Promise.resolve(fakeCatalogPage(url, products));
      }
      throw new Error(`Sin respuesta simulada para ${url}`);
    }),
  );
}

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

function productCardCountSafe(): number {
  return screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/producto/"))
    .length;
}

function productOrder(): number[] {
  const html = document.body.innerHTML;
  return ["Sticker DCC", "Taza DCC", "Polera DCC"].map((name) =>
    html.indexOf(name),
  );
}

describe("CatalogPage criteria in the URL", () => {
  it("applies the category from the URL and keeps it there", async () => {
    stubCatalog();
    renderCatalog(["/catalogo?categoria=tazas"]);

    expect(filterButton("Tazas").getAttribute("aria-pressed")).toBe("true");
    expect(filterButton("Todas").getAttribute("aria-pressed")).toBe("false");
    await waitFor(() => {
      expect(productCardCount()).toBe(1);
    });
    expect(screen.getByText("1 producto(s) encontrado(s)")).toBeDefined();
    expect(currentLocation()).toBe("/catalogo?categoria=tazas");
  });

  it("falls back to Todas for an unknown category", async () => {
    stubCatalog();
    renderCatalog(["/catalogo?categoria=gorros"]);

    expect(filterButton("Todas").getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => {
      expect(productCardCount()).toBe(3);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("writes the slug when choosing a category and removes it for Todas", async () => {
    stubCatalog();
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
    stubCatalog();
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

  it("ignores invalid URL params using defaults", async () => {
    stubCatalog();
    renderCatalog(["/catalogo?orden=raro&pagina=0&min=-5"]);

    await waitFor(() => {
      expect(productCardCount()).toBe(3);
    });
    expect(screen.getByText("3 producto(s) encontrado(s)")).toBeDefined();
  });
});

describe("CatalogPage search, sort and price", () => {
  it("searches by name and reflects q in the URL", async () => {
    stubCatalog();
    renderCatalog(["/catalogo"]);
    await screen.findByText("Taza DCC");

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar por nombre" }),
      { target: { value: "taza" } },
    );

    await waitFor(() => {
      expect(currentLocation()).toBe("/catalogo?q=taza");
    });
    await waitFor(() => {
      expect(productCardCount()).toBe(1);
    });
    expect(screen.getByText("Taza DCC")).toBeDefined();
    expect(screen.queryByText("Polera DCC")).toBeNull();
  });

  it("sorts by price and reflects orden in the URL", async () => {
    stubCatalog();
    renderCatalog(["/catalogo"]);
    await screen.findByText("Taza DCC");

    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "precio-menor" },
    });

    await waitFor(() => {
      expect(currentLocation()).toBe("/catalogo?orden=precio-menor");
    });
    await waitFor(() => {
      const [sticker, taza, polera] = productOrder();
      expect(sticker).toBeLessThan(taza ?? 0);
      expect(taza).toBeLessThan(polera ?? 0);
    });
  });

  it("filters by price range and reflects min and max in the URL", async () => {
    stubCatalog();
    renderCatalog(["/catalogo"]);
    await screen.findByText("Taza DCC");

    fireEvent.change(screen.getByLabelText("Precio mínimo"), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText("Precio máximo"), {
      target: { value: "9000" },
    });

    await waitFor(() => {
      expect(currentLocation()).toBe("/catalogo?min=5000&max=9000");
    });
    await waitFor(() => {
      expect(productCardCount()).toBe(1);
    });
    expect(screen.getByText("Taza DCC")).toBeDefined();
  });

  it("resets to page 1 when a criterion changes", async () => {
    const ten = Array.from({ length: 10 }, (_, index) =>
      makeProductFromExample(index),
    );
    stubCatalog(ten);
    renderCatalog(["/catalogo?pagina=2"]);
    await waitFor(() => {
      expect(screen.getByText("Página 2 de 2")).toBeDefined();
    });

    fireEvent.click(filterButton("Tazas"));
    await waitFor(() => {
      expect(currentLocation()).toBe("/catalogo?categoria=tazas");
    });
  });
});

function makeProductFromExample(index: number): Product {
  const base = exampleProducts[index % exampleProducts.length];
  if (!base) throw new Error("Sin producto de ejemplo.");
  return { ...base, id: `id-${index}`, name: `Producto ${index}` };
}

describe("CatalogPage pagination", () => {
  it("numbers pages 9 by 9 with aria-current", async () => {
    const ten = Array.from({ length: 10 }, (_, index) =>
      makeProductFromExample(index),
    );
    stubCatalog(ten);
    renderCatalog(["/catalogo"]);

    await waitFor(() => {
      expect(productCardCount()).toBe(9);
    });
    expect(screen.getByText("10 producto(s) encontrado(s)")).toBeDefined();
    expect(screen.getByText("Página 1 de 2")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Página 1" }).getAttribute("aria-current"),
    ).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Página 2" }));
    await waitFor(() => {
      expect(currentLocation()).toBe("/catalogo?pagina=2");
    });
    await waitFor(() => {
      expect(productCardCount()).toBe(1);
    });
    expect(screen.getByText("Página 2 de 2")).toBeDefined();
  });

  it("hides pagination with a single page", async () => {
    stubCatalog();
    renderCatalog(["/catalogo"]);
    await screen.findByText("Taza DCC");

    expect(screen.queryByRole("navigation", { name: "Paginación" })).toBeNull();
  });
});

describe("CatalogPage data loading", () => {
  it("shows the filters and a loading status while the catalog loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/auth/me") {
          return Promise.resolve(
            jsonResponse(401, { message: "Debes iniciar sesión." }),
          );
        }
        return new Promise<Response>(() => {});
      }),
    );
    renderCatalog(["/catalogo"]);

    expect(screen.getByText("Cargando productos…").getAttribute("role")).toBe(
      "status",
    );
    expect(filterButton("Todas")).toBeDefined();
    expect(filterButton("Tazas")).toBeDefined();
    expect(screen.getByRole("searchbox", { name: "Buscar por nombre" }))
      .toBeDefined();
    expect(productCardCountSafe()).toBe(0);
  });

  it("shows the empty state with Limpiar filtros and recovers", async () => {
    stubCatalog();
    renderCatalog(["/catalogo?q=zzz"]);
    await screen.findByText("No se encontraron productos con esos criterios.");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => {
      expect(currentLocation()).toBe("/catalogo");
    });
    await waitFor(() => {
      expect(productCardCount()).toBe(3);
    });
  });

  it("shows an error with Reintentar and recovers on retry", async () => {
    let failures = 1;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/auth/me") {
          return Promise.resolve(
            jsonResponse(401, { message: "Debes iniciar sesión." }),
          );
        }
        if (failures > 0) {
          failures -= 1;
          return Promise.resolve(
            jsonResponse(500, { message: "Falla del servidor" }),
          );
        }
        return Promise.resolve(fakeCatalogPage(url, exampleProducts));
      }),
    );
    renderCatalog(["/catalogo"]);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No se pudieron cargar los productos.");

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Taza DCC")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("treats a network failure as the error state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/auth/me") {
          return Promise.resolve(
            jsonResponse(401, { message: "Debes iniciar sesión." }),
          );
        }
        return Promise.reject(new TypeError("offline"));
      }),
    );
    renderCatalog(["/catalogo"]);

    expect(await screen.findByRole("alert")).toBeDefined();
  });
});
