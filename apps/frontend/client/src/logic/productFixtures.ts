import type { Product } from "@tiendadcc/utils";

// Test-only factory for Product objects (the public API contract). Tests pass
// the fields they care about; the rest get defaults, so a new model field only
// changes this file.
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "producto-de-prueba",
    name: "Producto de prueba",
    category: "Tazas",
    price: 6000,
    image: "/images/producto-de-prueba.png",
    description: "Producto de prueba.",
    featured: true,
    seller: {
      id: "6713b0c2a1f4e9d2c8b70a00",
      username: "tiendadcc",
      displayName: "TiendaDCC",
    },
    createdAt: "2026-10-13T15:00:00.000Z",
    updatedAt: "2026-10-13T15:00:00.000Z",
    ...overrides,
  };
}
