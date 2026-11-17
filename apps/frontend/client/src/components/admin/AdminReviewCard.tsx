import type { AdminReview } from "@tiendadcc/utils";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDate, isLowRating } from "../../logic/adminFormat.ts";
import {
  DELETE_REVIEW_TITLE,
  deleteReviewDescription,
} from "../../logic/adminMessages.ts";
import { ConfirmDeleteDialog } from "../ConfirmDeleteDialog.tsx";
import { StarRatingDisplay } from "../StarRatingDisplay.tsx";
import { Badge } from "../ui/badge.tsx";
import { AdminThumbnail } from "./AdminThumbnail.tsx";

interface AdminReviewCardProps {
  review: AdminReview;
  onDelete: (review: AdminReview) => Promise<void>;
}

// Reseña de la moderación (spec 013, RF-13). Las de 1 o 2 estrellas llevan
// borde ámbar (destructive) y la insignia "baja", así que la señal no depende
// solo del color. La API de reseñas solo trae `{ id, name }` del producto: la
// miniatura se pide al endpoint de imagen del producto, que sirve tanto las
// imágenes subidas como las rutas del seed.
export function AdminReviewCard({ review, onDelete }: AdminReviewCardProps) {
  const low = isLowRating(review.rating);
  const { product, author } = review;
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground",
        low ? "border-destructive" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          to={`/producto/${product.id}`}
          className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AdminThumbnail image={`/api/products/${product.id}/image`} />
          <span className="font-mono font-semibold break-words">
            {product.name}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <StarRatingDisplay rating={review.rating} />
          {low && <Badge variant="destructive">baja</Badge>}
        </div>
      </div>
      <p className="break-words">{review.comment}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">@{author.username}</span>
          {" · "}
          <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
        </p>
        <ConfirmDeleteDialog
          title={DELETE_REVIEW_TITLE}
          description={deleteReviewDescription(author.username, product.name)}
          triggerAriaLabel={`Eliminar reseña de @${author.username} sobre «${product.name}»`}
          onConfirm={() => onDelete(review)}
        />
      </div>
    </article>
  );
}
