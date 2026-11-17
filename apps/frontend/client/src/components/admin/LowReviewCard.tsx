import type { AdminReview } from "@tiendadcc/utils";
import { formatRelativeTime } from "../../logic/adminFormat.ts";
import { StarRatingDisplay } from "../StarRatingDisplay.tsx";

interface LowReviewCardProps {
  review: AdminReview;
  now: Date;
}

// Reseña baja por revisar en el Resumen (spec 013, RF-10): borde ámbar
// (destructive) y las estrellas con su texto accesible.
export function LowReviewCard({ review, now }: LowReviewCardProps) {
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-destructive p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono font-semibold">{review.product.name}</h3>
        <StarRatingDisplay rating={review.rating} />
      </div>
      <p>{review.comment}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-mono">@{review.author.username}</span>
        {" · "}
        <time dateTime={review.createdAt}>
          {formatRelativeTime(review.createdAt, now)}
        </time>
      </p>
    </article>
  );
}
