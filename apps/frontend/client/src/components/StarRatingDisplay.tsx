import { Star } from "lucide-react";

interface StarRatingDisplayProps {
  rating: number;
}

const STARS: readonly number[] = [1, 2, 3, 4, 5];

// Read-only stars for a product's average rating (spec 010, RF-2). The whole
// row is a single labelled image so assistive tech announces a single value
// ("4 de 5 estrellas") instead of five separate icons.
export function StarRatingDisplay({ rating }: StarRatingDisplayProps) {
  return (
    <span
      role="img"
      aria-label={`${rating} de 5 estrellas`}
      className="inline-flex items-center gap-0.5"
    >
      {STARS.map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={
            "size-5 " +
            (star <= rating ? "fill-current text-primary" : "text-muted-foreground")
          }
        />
      ))}
    </span>
  );
}
