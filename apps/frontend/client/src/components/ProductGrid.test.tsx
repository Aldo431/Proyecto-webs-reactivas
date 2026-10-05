import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { makeProduct } from "../logic/productFixtures.ts";
import type { Product } from "../logic/productParse.ts";
import { CartProvider } from "../context/CartContext.tsx";
import { ProductGrid } from "./ProductGrid.tsx";

const sampleProduct: Product = makeProduct({
  id: "cafe",
  name: "Polera",
  category: "Poleras",
  image: "/images/polera-dcc.png",
  description: "De prueba",
});

function renderGrid(products: Product[]) {
  return render(
    <MemoryRouter>
      <CartProvider>
        <ProductGrid products={products} />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe("ProductGrid", () => {
  it("renders a single product", () => {
    renderGrid([sampleProduct]);
    expect(screen.getByText("Polera")).toBeDefined();
  });

  it("renders many products without breaking", () => {
    const manyProducts: Product[] = Array.from({ length: 10 }, (_, index) => ({
      ...sampleProduct,
      id: `p-${index}`,
      name: `Producto ${index}`,
    }));
    renderGrid(manyProducts);
    expect(screen.getAllByRole("link")).toHaveLength(10);
  });

  it("renders zero products without breaking", () => {
    renderGrid([]);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("links each card to its product detail page", () => {
    renderGrid([sampleProduct]);
    const cardLink = screen.getByRole("link", { name: /Polera/ });
    expect(cardLink.getAttribute("href")).toBe("/producto/cafe");
  });
});
