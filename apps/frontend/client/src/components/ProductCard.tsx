import type { Product } from "../logic/productParse.ts";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <img
        src={product.image}
        alt={product.name}
        className="h-48 w-full object-cover"
      />
      <div className="p-5">
        <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {product.category}
        </span>
        <h3 className="mt-2 text-lg font-semibold text-brand-900">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-slate-600">{product.description}</p>
      </div>
    </article>
  );
}