import { fireEvent, render, screen } from "@testing-library/react";
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
import { stubAuthFetch } from "../test/authMocks.ts";

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

beforeEach(() => {
  stubAuthFetch();
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

describe("CatalogPage category param", () => {
  it("selects the category given in ?categoria", () => {
    renderCatalog(["/catalogo?categoria=tazas"]);
    expect(filterButton("Tazas").getAttribute("aria-pressed")).toBe("true");
    expect(filterButton("Todas").getAttribute("aria-pressed")).toBe("false");
    expect(productCardCount()).toBe(1);
  });

  it("falls back to Todas for an unknown category", () => {
    renderCatalog(["/catalogo?categoria=gorros"]);
    expect(filterButton("Todas").getAttribute("aria-pressed")).toBe("true");
    expect(productCardCount()).toBe(3);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("writes the slug when choosing a category and removes it for Todas", () => {
    renderCatalog(["/catalogo"]);

    fireEvent.click(filterButton("Tazas"));
    expect(currentLocation()).toBe("/catalogo?categoria=tazas");
    expect(filterButton("Tazas").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(filterButton("Todas"));
    expect(currentLocation()).toBe("/catalogo");
    expect(filterButton("Todas").getAttribute("aria-pressed")).toBe("true");
  });

  it("does not add history entries when changing the filter", () => {
    renderCatalog(["/", "/catalogo"]);

    fireEvent.click(filterButton("Tazas"));
    fireEvent.click(filterButton("Poleras"));
    fireEvent.click(filterButton("Stickers"));
    expect(currentLocation()).toBe("/catalogo?categoria=stickers");

    fireEvent.click(screen.getByRole("button", { name: "Atrás (sonda)" }));
    expect(currentLocation()).toBe("/");
    expect(screen.getByText("Inicio (sonda)")).toBeDefined();
  });
});
