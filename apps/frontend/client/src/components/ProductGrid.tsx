import type { Product } from "@tiendadcc/utils";
import { usePromotions } from "../logic/usePromotions.ts";
import { ProductCard } from "./ProductCard.tsx";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const promotions = usePromotions();
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <h2 className="mb-8 text-3xl font-bold text-foreground">Productos</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} promotions={promotions} />
        ))}
      </div>
    </section>
  );
}