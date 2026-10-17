import { Star } from "lucide-react";
import { useId } from "react";

interface StarRatingInputProps {
  name: string;
  legend: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean | undefined;
  // Wires the fieldset to an external error message (TextField pattern).
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
}

const STARS: readonly number[] = [1, 2, 3, 4, 5];

// Accessible rating control (spec 010, RF-6, plan D8): a group of radio inputs
// inside a fieldset, so arrow keys move between stars and every option
// announces "N de 5 estrellas". The visible star is the radio's label.
export function StarRatingInput({
  name,
  legend,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: StarRatingInputProps) {
  const groupId = useId();

  return (
    <fieldset
      disabled={disabled}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      className="space-y-2"
    >
      <legend className="text-sm font-semibold text-foreground">
        {legend}
      </legend>
      <div className="flex items-center gap-1">
        {STARS.map((star) => {
          const filled = star <= value;
          return (
            <label
              key={star}
              htmlFor={`${groupId}-${star}`}
              className="cursor-pointer rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
            >
              <input
                id={`${groupId}-${star}`}
                type="radio"
                name={name}
                value={star}
                checked={star === value}
                onChange={() => onChange(star)}
                className="peer sr-only"
                aria-label={`${star} de 5 estrellas`}
              />
              <Star
                aria-hidden="true"
                className={
                  "size-7 transition-colors " +
                  (filled ? "fill-current text-primary" : "text-muted-foreground")
                }
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
