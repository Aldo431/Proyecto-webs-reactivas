import { useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import type { CreateReviewInput } from "@tiendadcc/utils";
import { useAuth } from "../context/AuthContext.tsx";
import {
  averageStars,
  findOwnReview,
  formatAverageRating,
} from "../logic/reviewFormat.ts";
import type { ReviewFailure } from "../logic/reviewApi.ts";
import { useReviews, type ReviewApi } from "../logic/useReviews.ts";
import { Button } from "../components/ui/button.tsx";
import { ReviewCard } from "./ReviewCard.tsx";
import { ReviewForm } from "./ReviewForm.tsx";
import { StarRatingDisplay } from "./StarRatingDisplay.tsx";

interface ReviewListProps {
  productId: string;
  // Injected by tests; the page uses the default client.
  api?: ReviewApi | undefined;
}

type FormMode = "idle" | "create" | "edit";

// Turns an API failure into the form's error map: field messages when present,
// otherwise the general one under `form` (spec 010, RF-5, RF-6).
function toFieldErrors(failure: ReviewFailure): Record<string, string> {
  const errors: Record<string, string> = { ...(failure.fieldErrors ?? {}) };
  if (Object.keys(errors).length === 0) {
    errors.form = failure.message;
  }
  return errors;
}

// Reviews section for the product detail page (spec 010, RF-6): summary,
// semantic list, and the write controls that depend on the session. It only
// orchestrates state; the data comes from `useReviews`.
export function ReviewList({ productId, api }: ReviewListProps) {
  const { state, retry, addReview, editReview, removeReview } = useReviews(
    productId,
    api,
  );
  const { state: authState } = useAuth();
  const [mode, setMode] = useState<FormMode>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string> | undefined
  >(undefined);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const list = state.status === "success" ? state.list : null;
  const user = authState.status === "authenticated" ? authState.user : null;
  const own =
    list !== null && user !== null
      ? findOwnReview(list.reviews, user.id)
      : undefined;
  const isAuthenticated = authState.status === "authenticated";

  function closeForm() {
    setMode("idle");
    setFieldErrors(undefined);
  }

  async function handleCreate(input: CreateReviewInput): Promise<void> {
    setSubmitting(true);
    setFieldErrors(undefined);
    const result = await addReview(input);
    setSubmitting(false);
    if (result.ok) {
      setMode("idle");
      return;
    }
    setFieldErrors(toFieldErrors(result));
  }

  async function handleEdit(input: CreateReviewInput): Promise<void> {
    if (own === undefined) {
      return;
    }
    setSubmitting(true);
    setFieldErrors(undefined);
    const result = await editReview(own.id, input);
    setSubmitting(false);
    if (result.ok) {
      setMode("idle");
      return;
    }
    setFieldErrors(toFieldErrors(result));
  }

  async function handleDelete(reviewId: string): Promise<void> {
    setDeleteError(null);
    const result = await removeReview(reviewId);
    if (!result.ok) {
      setDeleteError(result.message);
    }
    setMode("idle");
  }

  return (
    <section
      aria-labelledby="reviews-heading"
      className="mx-auto mt-14 max-w-3xl"
    >
      <h2 id="reviews-heading" className="text-2xl font-bold text-foreground">
        Reseñas
      </h2>

      {state.status === "loading" && (
        <p role="status" className="mt-4 text-muted-foreground">
          Cargando reseñas…
        </p>
      )}

      {state.status === "error" && (
        <div
          role="alert"
          className="mt-4 flex flex-col items-start gap-4 rounded-xl border border-destructive p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2 text-destructive">
            <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
            {state.message}
          </p>
          <Button variant="outline" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}

      {list !== null && (
        <>
          {list.total === 0 ? (
            <p className="mt-4 text-muted-foreground">
              Sé el primero en reseñar este producto.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StarRatingDisplay rating={averageStars(list.promedioRating)} />
              <span className="font-mono text-sm text-muted-foreground">
                {formatAverageRating(list.promedioRating)} de 5 · {list.total}{" "}
                {list.total === 1 ? "reseña" : "reseñas"}
              </span>
            </div>
          )}

          {deleteError !== null && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {deleteError}
            </p>
          )}

          {authState.status === "anonymous" && (
            <p className="mt-6 text-muted-foreground">
              <Link
                to="/iniciar-sesion"
                className="text-primary underline underline-offset-4"
              >
                Inicia sesión
              </Link>{" "}
              para reseñar este producto.
            </p>
          )}

          {isAuthenticated && mode === "create" && (
            <div className="mt-6">
              <ReviewForm
                onSubmit={(input) => {
                  void handleCreate(input);
                }}
                onCancel={closeForm}
                submitting={submitting}
                fieldErrors={fieldErrors}
              />
            </div>
          )}

          {isAuthenticated && mode === "edit" && own !== undefined && (
            <div className="mt-6">
              <ReviewForm
                initial={own}
                onSubmit={(input) => {
                  void handleEdit(input);
                }}
                onCancel={closeForm}
                submitting={submitting}
                fieldErrors={fieldErrors}
              />
            </div>
          )}

          {isAuthenticated && own === undefined && mode === "idle" && (
            <div className="mt-6">
              <Button
                type="button"
                onClick={() => {
                  setMode("create");
                  setFieldErrors(undefined);
                }}
              >
                Escribir reseña
              </Button>
            </div>
          )}

          {list.reviews.length > 0 && (
            <ul className="mt-6 flex flex-col gap-4">
              {list.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isOwn={own?.id === review.id}
                  onEdit={() => {
                    setFieldErrors(undefined);
                    setMode("edit");
                  }}
                  onDelete={() => handleDelete(review.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
