export const FEATURED_PRODUCT_COUNT = 3;

export function getProductById<T extends { id: string }>(
  products: T[],
  id: string,
): T | undefined {
  return products.find((product) => product.id === id);
}

// Featured products are the ones flagged `featured: true`, in catalog order,
// capped at `count` (Home RF-8). The same selection applies to the bundled
// JSON and to a future GET /api/products?featured=true response.
export function selectFeaturedProducts<T extends { featured: boolean }>(
  products: T[],
  count: number,
): T[] {
  return products
    .filter((product) => product.featured)
    .slice(0, Math.max(0, count));
}
