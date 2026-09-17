import type { Product } from "./productParse.ts";

export function getProductById(
  products: Product[],
  id: string,
): Product | undefined {
  return products.find((product) => product.id === id);
}
