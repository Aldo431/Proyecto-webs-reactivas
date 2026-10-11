import type { Product } from "./productParse.ts";

export function getCategories(products: Product[]): string[] {
  const categories: string[] = [];
  for (const product of products) {
    if (!categories.includes(product.category)) {
      categories.push(product.category);
    }
  }
  return categories;
}

export function filterProductsByCategory(
  products: Product[],
  category: string | null,
): Product[] {
  if (category === null) return products;
  return products.filter((product) => product.category === category);
}
