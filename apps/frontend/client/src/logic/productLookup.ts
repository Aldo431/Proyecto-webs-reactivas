import type { Product } from "./productParse.ts";

export const FEATURED_PRODUCT_COUNT = 3;

export function getProductById(
  products: Product[],
  id: string,
): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getFeaturedProducts(
  products: Product[],
  count: number,
): Product[] {
  return products.slice(0, Math.max(0, count));
}
