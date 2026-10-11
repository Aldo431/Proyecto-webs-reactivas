import type { Product } from "../logic/productParse.ts";
import { ProductCard } from "./ProductCard.tsx";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <h2 className="mb-8 text-3xl font-bold text-brand-900">Productos</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}