export function filterProductsByCategory<T extends { category: string }>(
  products: T[],
  category: string | null,
): T[] {
  if (category === null) return products;
  return products.filter((product) => product.category === category);
}
