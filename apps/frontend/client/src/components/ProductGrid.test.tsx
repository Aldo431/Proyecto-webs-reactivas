import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Product } from "../logic/productParse.ts";
import { ProductGrid } from "./ProductGrid.tsx";

const sampleProduct: Product = {
  id: "cafe",
  name: "Polera",
  category: "Poleras",
  image: "/images/polera-dcc.png",
  description: "De prueba",
};

describe("ProductGrid", () => {
  it("renders a single product", () => {
    render(<ProductGrid products={[sampleProduct]} />);
    expect(screen.getByText("Polera")).toBeDefined();
  });

  it("renders many products without breaking", () => {
    const manyProducts: Product[] = Array.from({ length: 10 }, (_, index) => ({
      ...sampleProduct,
      id: `p-${index}`,
      name: `Producto ${index}`,
    }));
    render(<ProductGrid products={manyProducts} />);
    expect(screen.getAllByRole("article")).toHaveLength(10);
  });

  it("renders zero products without breaking", () => {
    render(<ProductGrid products={[]} />);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});