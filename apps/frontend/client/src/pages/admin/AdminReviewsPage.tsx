import { ADMIN_REVIEW_SORT_ORDERS, type AdminReview } from "@tiendadcc/utils";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminErrorState } from "../../components/admin/AdminErrorState.tsx";
import { AdminNotice } from "../../components/admin/AdminNotice.tsx";
import { AdminReviewCard } from "../../components/admin/AdminReviewCard.tsx";
import { AdminSectionHeading } from "../../components/admin/AdminSectionHeading.tsx";
import { AdminSelect } from "../../components/admin/AdminSelect.tsx";
import { SegmentedFilter } from "../../components/admin/SegmentedFilter.tsx";
import { CatalogPagination } from "../../components/CatalogPagination.tsx";
import { deleteAdminReview, fetchAdminReviews } from "../../logic/adminApi.ts";
import { formatRange } from "../../logic/adminFormat.ts";
import {
  REVIEWS_EMPTY,
  REVIEW_DELETED_NOTICE,
} from "../../logic/adminMessages.ts";
import {
  ADMIN_REVIEW_RATING_OPTIONS,
  ADMIN_REVIEW_SORT_OPTIONS,
  buildAdminReviewsParams,
  changeFilters,
  changePage,
  parseAdminReviewsParams,
  type AdminReviewsQuery,
} from "../../logic/adminQuery.ts";
import { useAdminList } from "../../logic/useAdminList.ts";

interface Notice {
  tone: "success" | "error";
  text: string;
}

const NOT_FOUND = 404;

const SORT_OPTIONS = ADMIN_REVIEW_SORT_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

// /admin/resenas (spec 013, RF-13): moderation with a rating filter and order
// kept in the URL, and delete with confirmation.
export function AdminReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(
    () => parseAdminReviewsParams(searchParams),
    [searchParams],
  );
  const goTo = useCallback(
    (next: AdminReviewsQuery, replace = false) => {
      setSearchParams(buildAdminReviewsParams(next), { replace });
    },
    [setSearchParams],
  );
  const [notice, setNotice] = useState<Notice | null>(null);

  const { state, reload, updateItems } = useAdminList(
    fetchAdminReviews,
    query,
    { onPageAdjusted: (pagina) => goTo(changePage(query, pagina), true) },
  );

  async function handleDelete(review: AdminReview): Promise<void> {
    setNotice(null);
    const result = await deleteAdminReview(review.id);
    if (result.ok) {
      updateItems((items) => items.filter((item) => item.id !== review.id));
      setNotice({ tone: "success", text: REVIEW_DELETED_NOTICE });
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
      <AdminSectionHeading path="/admin/resenas" />

      <div className="flex flex-wrap items-end gap-4">
        <SegmentedFilter
          ariaLabel="Calificación"
          options={ADMIN_REVIEW_RATING_OPTIONS}
          value={query.calificacion}
          onChange={(calificacion) =>
            goTo(changeFilters(query, { calificacion }))
          }
        />
        <AdminSelect
          id="admin-reviews-sort"
          label="Ordenar"
          options={SORT_OPTIONS}
          value={query.orden}
          onChange={(value) =>
            goTo(
              changeFilters(query, {
                orden:
                  ADMIN_REVIEW_SORT_ORDERS.find((order) => order === value) ??
                  "recientes",
              }),
            )
          }
        />
      </div>

      {notice !== null && (
        <AdminNotice tone={notice.tone}>{notice.text}</AdminNotice>
      )}

      {state.status === "loading" && (
        <p role="status" aria-busy="true" className="text-muted-foreground">
          Cargando reseñas…
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
          <p className="text-muted-foreground">{REVIEWS_EMPTY}</p>
        ) : (
          <div className="flex flex-col gap-4" aria-busy={state.refreshing}>
            <ul className="flex flex-col gap-3">
              {state.data.items.map((review) => (
                <li key={review.id}>
                  <AdminReviewCard review={review} onDelete={handleDelete} />
                </li>
              ))}
            </ul>
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
