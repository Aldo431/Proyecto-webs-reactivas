import { PRODUCT_CATEGORIES } from "@tiendadcc/utils";
import { CircleAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { CategoryFilter } from "../components/CategoryFilter.tsx";
import { Header } from "../components/Header.tsx";
import { ProductGrid } from "../components/ProductGrid.tsx";
import { Button } from "../components/ui/button.tsx";
import {
  CATEGORY_PARAM,
  parseCategoryParam,
  toCategorySlug,
} from "../logic/categoryParam.ts";
import { filterProductsByCategory } from "../logic/productFilter.ts";
import { fetchCatalogProducts } from "../logic/productRepository.ts";
import { useProductList } from "../logic/useProductList.ts";

// The filters come from the shared category list, not from the loaded data,
// so they are available while the catalog loads (spec 008, RF-14).
const categories: string[] = [...PRODUCT_CATEGORIES];

export function CatalogPage() {
  // The catalog is requested once; changing the category filters the loaded
  // list locally, so the grid updates instantly (spec 008, RF-14, D9).
  const { state, retry } = useProductList(fetchCatalogProducts);
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

  const visibleProducts =
    state.status === "success"
      ? filterProductsByCategory(state.products, activeCategory)
      : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-brand-900">Catálogo</h1>
        <div className="mt-6">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={selectCategory}
          />
        </div>
        {state.status === "loading" && (
          <p role="status" className="py-14 text-center text-muted-foreground">
            Cargando productos…
          </p>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="mt-8 flex flex-col items-start gap-4 rounded-xl border border-destructive p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-center gap-2 font-sans text-destructive">
              <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
              No se pudieron cargar los productos.
            </p>
            <Button variant="outline" onClick={retry}>
              Reintentar
            </Button>
          </div>
        )}
        {state.status === "success" &&
          (visibleProducts.length === 0 ? (
            <p className="py-14 text-center text-slate-600">
              No hay productos en esta categoría.
            </p>
          ) : (
            <ProductGrid products={visibleProducts} />
          ))}
      </main>
    </div>
  );
}
