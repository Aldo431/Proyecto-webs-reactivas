import type { Product } from "./productParse.ts";

// Test-only factory for Product objects. Tests pass the fields they care
// about; the rest get defaults, so a new model field only changes this file.
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "producto-de-prueba",
    name: "Producto de prueba",
    category: "Pruebas",
    image: "/images/producto-de-prueba.png",
    description: "Producto de prueba.",
    featured: true,
    ...overrides,
  };
}
