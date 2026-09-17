import { useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter.tsx";
import { Header } from "../components/Header.tsx";
import { ProductGrid } from "../components/ProductGrid.tsx";
import productsJson from "../data/products.json";
import {
  filterProductsByCategory,
  getCategories,
} from "../logic/productFilter.ts";
import { parseProducts } from "../logic/productParse.ts";

const productCatalog = parseProducts(productsJson);
const categories = getCategories(productCatalog);

export function CatalogPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const visibleProducts = filterProductsByCategory(
    productCatalog,
    activeCategory,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header showBackButton={true} backLabel="Volver al inicio" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-brand-900">Catálogo</h1>
        <div className="mt-6">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        </div>
        {visibleProducts.length === 0 ? (
          <p className="py-14 text-center text-slate-600">
            No hay productos en esta categoría.
          </p>
        ) : (
          <ProductGrid products={visibleProducts} />
        )}
      </main>
    </div>
  );
}
