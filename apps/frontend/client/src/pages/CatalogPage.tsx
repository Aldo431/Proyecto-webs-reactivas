import { PRODUCT_CATEGORIES, type ProductCategory } from "@tiendadcc/utils";
import { CircleAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { CatalogPagination } from "../components/CatalogPagination.tsx";
import { CatalogPriceFilter } from "../components/CatalogPriceFilter.tsx";
import { CatalogSearchBar } from "../components/CatalogSearchBar.tsx";
import { CatalogSortSelect } from "../components/CatalogSortSelect.tsx";
import { CategoryFilter } from "../components/CategoryFilter.tsx";
import { Header } from "../components/Header.tsx";
import { ProductGrid } from "../components/ProductGrid.tsx";
import { Button } from "../components/ui/button.tsx";
import {
  buildCatalogParams,
  CATALOG_DEFAULTS,
  parseCatalogParams,
  type CatalogQuery,
} from "../logic/catalogQuery.ts";
import { useCatalogPage } from "../logic/useCatalogPage.ts";

// The filters come from the shared category list, not from the loaded data,
// so they are available while the catalog loads (spec 008, RF-14).
const categories: string[] = [...PRODUCT_CATEGORIES];

export function CatalogPage() {
  // The URL is the only source of truth for every criterion (spec 009, RF-7):
  // invalid values fall back to defaults (spec 009, RF-7 via catalogQuery).
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseCatalogParams(searchParams, categories);
  const { state, retry } = useCatalogPage(query);

  // replace: true keeps filter changes out of the history, so "back" leaves
  // the catalog instead of stepping through previous filters (Home RF-6).
  function updateQuery(patch: Partial<CatalogQuery>, resetPage = true): void {
    setSearchParams(
      (previous) => {
        const current = parseCatalogParams(previous, categories);
        const next: CatalogQuery = {
          ...current,
          ...patch,
          pagina: resetPage ? 1 : (patch.pagina ?? current.pagina),
        };
        return buildCatalogParams(next);
      },
      { replace: true },
    );
  }

  function clearFilters(): void {
    setSearchParams(buildCatalogParams(CATALOG_DEFAULTS), { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground">Catálogo</h1>
        <div className="mt-6 flex flex-col gap-4">
          <CatalogSearchBar
            value={query.q}
            onChange={(value) => updateQuery({ q: value })}
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <CatalogSortSelect
              value={query.orden}
              onChange={(orden) => updateQuery({ orden })}
            />
            <CatalogPriceFilter
              min={query.min}
              max={query.max}
              onChange={(min, max) => updateQuery({ min, max })}
            />
          </div>
          <CategoryFilter
            categories={categories}
            activeCategory={query.categoria}
            onSelectCategory={(category) =>
              updateQuery({
                // The value comes from our own category list (spec 008, RF-1).
                categoria: category as ProductCategory | null,
              })
            }
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
          (state.products.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-14 text-center">
              <p className="text-muted-foreground">
                No se encontraron productos con esos criterios.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <>
              <p role="status" className="mt-6 text-sm text-muted-foreground">
                {state.total} producto(s) encontrado(s)
              </p>
              <ProductGrid products={state.products} />
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="font-mono text-sm text-muted-foreground">
                  Página {state.pagina} de {state.totalPaginas}
                </p>
                <CatalogPagination
                  pagina={state.pagina}
                  totalPaginas={state.totalPaginas}
                  onSelectPage={(pagina) => updateQuery({ pagina }, false)}
                />
              </div>
            </>
          ))}
      </main>
    </div>
  );
}
