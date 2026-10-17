import type { Review } from "@tiendadcc/utils";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog.tsx";
import { StarRatingDisplay } from "./StarRatingDisplay.tsx";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";

interface ReviewCardProps {
  review: Review;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// One review as a semantic list item (spec 010, RF-6, RNF-3): author,
// rating, the comment as literal text (React escapes it, no HTML) and date.
// The owner also gets "Editar" and "Borrar" (confirmed with the shared dialog).
export function ReviewCard({
  review,
  isOwn,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">
            {review.author.displayName}
          </span>
          {isOwn && <Badge variant="secondary">Tu reseña</Badge>}
        </div>
        <time
          dateTime={review.createdAt}
          className="font-mono text-xs text-muted-foreground"
        >
          {dateFormatter.format(new Date(review.createdAt))}
        </time>
      </div>
      <div className="mt-2">
        <StarRatingDisplay rating={review.rating} />
      </div>
      <p className="mt-2 break-words whitespace-pre-line text-foreground">
        {review.comment}
      </p>
      {isOwn && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <ConfirmDeleteDialog
            triggerLabel="Borrar"
            triggerAriaLabel="Borrar tu reseña"
            title="Borrar reseña"
            description="¿Borrar tu reseña? Esta acción no se puede deshacer."
            confirmLabel="Borrar"
            onConfirm={onDelete}
          />
        </div>
      )}
    </li>
  );
}
