import type { AdminOverview } from "@tiendadcc/utils";
import { Link } from "react-router-dom";
import { ActivityList } from "../../components/admin/ActivityList.tsx";
import { AdminCardSection } from "../../components/admin/AdminCardSection.tsx";
import { AdminErrorState } from "../../components/admin/AdminErrorState.tsx";
import { AdminSectionHeading } from "../../components/admin/AdminSectionHeading.tsx";
import { CategoryBars } from "../../components/admin/CategoryBars.tsx";
import { LatestProductsTable } from "../../components/admin/LatestProductsTable.tsx";
import { LowReviewCard } from "../../components/admin/LowReviewCard.tsx";
import { StatCard } from "../../components/admin/StatCard.tsx";
import { Button } from "../../components/ui/button.tsx";
import { overviewStats } from "../../logic/adminFormat.ts";
import { useAdminOverview } from "../../logic/useAdminOverview.ts";

const SECTION_GRID =
  "grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))]";

// /admin (spec 013, RF-10): the only terminal nod of the admin view. Data
// comes from `useAdminOverview`; nothing is cached between visits (RF-14).
export function AdminOverviewPage() {
  const { state, reload } = useAdminOverview();
  const refreshing = state.status === "ready" && state.refreshing;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-4">
          <p className="font-mono text-sm text-muted-foreground">
            <span aria-hidden="true" className="mr-2 text-terminal-prompt">
              $
            </span>
            sudo tiendadcc --resumen
          </p>
          <AdminSectionHeading path="/admin" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={state.status === "loading" || refreshing}
          onClick={reload}
        >
          Actualizar
        </Button>
      </div>

      {state.status === "loading" && (
        <p role="status" aria-busy="true" className="text-muted-foreground">
          Cargando resumen…
        </p>
      )}
      {state.status === "error" && (
        <AdminErrorState
          message={state.message}
          httpStatus={state.httpStatus}
          onRetry={reload}
        />
      )}
      {state.status === "ready" && (
        <OverviewContent overview={state.data} now={new Date()} />
      )}
    </div>
  );
}

interface OverviewContentProps {
  overview: AdminOverview;
  now: Date;
}

function OverviewContent({ overview, now }: OverviewContentProps) {
  return (
    <>
      <dl className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))]">
        {overviewStats(overview).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </dl>

      <div className={SECTION_GRID}>
        <AdminCardSection title="Productos por categoría">
          <CategoryBars byCategory={overview.products.byCategory} />
        </AdminCardSection>
        <AdminCardSection title="Actividad reciente">
          <ActivityList events={overview.activity} now={now} />
        </AdminCardSection>
      </div>

      <div className={SECTION_GRID}>
        <AdminCardSection
          title="Últimas publicaciones"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/admin/productos">Ver todas →</Link>
            </Button>
          }
        >
          <LatestProductsTable products={overview.latestProducts} />
        </AdminCardSection>
        <AdminCardSection
          title="Reseñas por revisar"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/admin/resenas">Ir a moderación →</Link>
            </Button>
          }
        >
          {overview.lowReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay reseñas con calificación baja esta semana.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {overview.lowReviews.map((review) => (
                <LowReviewCard key={review.id} review={review} now={now} />
              ))}
            </div>
          )}
        </AdminCardSection>
      </div>
    </>
  );
}
