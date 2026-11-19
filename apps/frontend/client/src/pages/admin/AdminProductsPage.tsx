import { PRODUCT_CATEGORIES } from "@tiendadcc/utils";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminErrorState } from "../../components/admin/AdminErrorState.tsx";
import { AdminNotice } from "../../components/admin/AdminNotice.tsx";
import { AdminProductsTable } from "../../components/admin/AdminProductsTable.tsx";
import { AdminSearchField } from "../../components/admin/AdminSearchField.tsx";
import { AdminSectionHeading } from "../../components/admin/AdminSectionHeading.tsx";
import { AdminSelect } from "../../components/admin/AdminSelect.tsx";
import { SegmentedFilter } from "../../components/admin/SegmentedFilter.tsx";
import { CatalogPagination } from "../../components/CatalogPagination.tsx";
import {
  deleteAdminProduct,
  fetchAdminProducts,
  setProductFeatured,
} from "../../logic/adminApi.ts";
import { formatRange } from "../../logic/adminFormat.ts";
import {
  PRODUCTS_EMPTY,
  PRODUCT_DELETED_NOTICE,
  featuredNotice,
} from "../../logic/adminMessages.ts";
import {
  buildAdminProductsParams,
  changeFilters,
  changePage,
  parseAdminProductsParams,
  type AdminProductsQuery,
} from "../../logic/adminQuery.ts";
import { useAdminList } from "../../logic/useAdminList.ts";
import { useDebouncedSearch } from "../../logic/useDebouncedSearch.ts";

interface Notice {
  tone: "success" | "error";
  text: string;
}

const NOT_FOUND = 404;

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  ...PRODUCT_CATEGORIES.map((category) => ({
    value: category,
    label: category,
  })),
];

const FEATURED_OPTIONS = [
  { value: false, label: "Todos" },
  { value: true, label: "Destacados" },
];

// /admin/productos (spec 013, RF-11): every product from every seller, with
// filters kept in the URL, a featured switch and delete. The page only wires
// `adminApi` to the components (constitution §3).
export function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(
    () => parseAdminProductsParams(searchParams),
    [searchParams],
  );
  const goTo = useCallback(
    (next: AdminProductsQuery, replace = false) => {
      setSearchParams(buildAdminProductsParams(next), { replace });
    },
    [setSearchParams],
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const { state, reload, updateItems } = useAdminList(
    fetchAdminProducts,
    query,
    { onPageAdjusted: (pagina) => goTo(changePage(query, pagina), true) },
  );
  const [searchText, setSearchText] = useDebouncedSearch(query.q, (q) =>
    goTo(changeFilters(query, { q })),
  );

  function setPending(id: string, pending: boolean) {
    setPendingIds((previous) => {
      const next = new Set(previous);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleToggleFeatured(
    product: { id: string; name: string; featured: boolean },
  ): Promise<void> {
    setNotice(null);
    setPending(product.id, true);
    const result = await setProductFeatured(product.id, !product.featured);
    setPending(product.id, false);
    if (result.ok) {
      updateItems((items) =>
        items.map((item) => (item.id === product.id ? result.data : item)),
      );
      setNotice({
        tone: "success",
        text: featuredNotice(product.name, result.data.featured),
      });
      // Con el filtro "Destacados" la fila ya no corresponde: se recarga.
      if (query.destacados) {
        reload();
      }
      return;
    }
    setNotice({ tone: "error", text: result.message });
    if (result.status === NOT_FOUND) {
      reload();
    }
  }

  async function handleDelete(product: { id: string }): Promise<void> {
    setNotice(null);
    const result = await deleteAdminProduct(product.id);
    if (result.ok) {
      updateItems((items) => items.filter((item) => item.id !== product.id));
      setNotice({ tone: "success", text: PRODUCT_DELETED_NOTICE });
      reload();
      return;
    }
    setNotice({ tone: "error", text: result.message });
    if (result.status === NOT_FOUND) {
      reload();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionHeading path="/admin/productos" />

      <div className="flex flex-wrap items-end gap-4">
        <AdminSearchField
          id="admin-products-search"
          placeholder="Nombre o vendedor"
          value={searchText}
          onChange={setSearchText}
        />
        <AdminSelect
          id="admin-products-category"
          label="Categoría"
          options={CATEGORY_OPTIONS}
          value={query.categoria ?? ""}
          onChange={(value) =>
            goTo(
              changeFilters(query, {
                categoria:
                  PRODUCT_CATEGORIES.find((category) => category === value) ??
                  null,
              }),
            )
          }
        />
        <SegmentedFilter
          ariaLabel="Mostrar"
          options={FEATURED_OPTIONS}
          value={query.destacados}
          onChange={(destacados) =>
            goTo(changeFilters(query, { destacados }))
          }
        />
      </div>

      {notice !== null && (
        <AdminNotice tone={notice.tone}>{notice.text}</AdminNotice>
      )}

      {state.status === "loading" && (
        <p role="status" aria-busy="true" className="text-muted-foreground">
          Cargando productos…
        </p>
      )}
      {state.status === "error" && (
        <AdminErrorState
          message={state.message}
          httpStatus={state.httpStatus}
          onRetry={reload}
        />
      )}
      {state.status === "ready" &&
        (state.data.items.length === 0 ? (
          <p className="text-muted-foreground">{PRODUCTS_EMPTY}</p>
        ) : (
          <div className="flex flex-col gap-4" aria-busy={state.refreshing}>
            <AdminProductsTable
              products={state.data.items}
              pendingIds={pendingIds}
              onToggleFeatured={handleToggleFeatured}
              onDelete={handleDelete}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {formatRange(
                  state.data.pagina,
                  state.data.porPagina,
                  state.data.total,
                )}
              </p>
              <CatalogPagination
                pagina={state.data.pagina}
                totalPaginas={state.data.totalPaginas}
                onSelectPage={(pagina) => goTo(changePage(query, pagina))}
              />
            </div>
          </div>
        ))}
    </div>
  );
}
