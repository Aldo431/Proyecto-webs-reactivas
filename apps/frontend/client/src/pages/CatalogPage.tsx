import { useSearchParams } from "react-router-dom";
import { CategoryFilter } from "../components/CategoryFilter.tsx";
import { Header } from "../components/Header.tsx";
import { ProductGrid } from "../components/ProductGrid.tsx";
import productsJson from "../data/products.json";
import {
  CATEGORY_PARAM,
  parseCategoryParam,
  toCategorySlug,
} from "../logic/categoryParam.ts";
import {
  filterProductsByCategory,
  getCategories,
} from "../logic/productFilter.ts";
import { parseProducts } from "../logic/productParse.ts";

const productCatalog = parseProducts(productsJson);
const categories = getCategories(productCatalog);

export function CatalogPage() {
  // The URL is the only source of truth for the active filter (plan D9):
  // an invalid or unknown `categoria` falls back to "Todas" (null).
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = parseCategoryParam(
    searchParams.get(CATEGORY_PARAM),
    categories,
  );

  // replace: true keeps filter changes out of the history, so "back" leaves
  // the catalog instead of stepping through previous filters (Home RF-6).
  function selectCategory(category: string | null): void {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (category === null) {
          next.delete(CATEGORY_PARAM);
        } else {
          next.set(CATEGORY_PARAM, toCategorySlug(category));
        }
        return next;
      },
      { replace: true },
    );
  }

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
            onSelectCategory={selectCategory}
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
