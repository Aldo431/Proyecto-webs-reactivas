import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  COMMENT_MAX_LENGTH,
  createReviewInputSchema,
  type CreateReviewInput,
  type Review,
} from "@tiendadcc/utils";
import { issuesToFieldErrors } from "../logic/formErrors.ts";
import { StarRatingInput } from "./StarRatingInput.tsx";
import { Button } from "./ui/button.tsx";
import { Label } from "./ui/label.tsx";
import { Textarea } from "./ui/textarea.tsx";

interface ReviewFormProps {
  // When editing, the review to preload; when creating, undefined.
  initial?: Review | undefined;
  onSubmit: (input: CreateReviewInput) => void;
  onCancel?: (() => void) | undefined;
  submitting: boolean;
  // Backend 400 field messages (plus `form` for general errors); values are
  // kept so the user never loses what they typed.
  fieldErrors?: Record<string, string> | undefined;
}

type FieldName = "rating" | "comment";

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined || message === "") {
    return null;
  }
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

// Publish/edit form for a review (spec 010, RF-6): StarRatingInput plus the
// shared Textarea, mirroring TextField's accessible error (`aria-invalid` +
// `aria-describedby` pointing at a `role="alert"` message). Local state keeps
// the review while the parent drives the request (submitting/fieldErrors).
export function ReviewForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  fieldErrors,
}: ReviewFormProps) {
  const ids = useId();
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);
  const [comment, setComment] = useState<string>(initial?.comment ?? "");
  const [localErrors, setLocalErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const formRef = useRef<HTMLFormElement>(null);

  const ratingErrorId = `${ids}-rating-error`;
  const commentId = `${ids}-comment`;
  const commentErrorId = `${ids}-comment-error`;
  const commentCountId = `${ids}-comment-count`;
  const formErrorId = `${ids}-form-error`;

  const ratingError = localErrors.rating ?? fieldErrors?.rating;
  const commentError = localErrors.comment ?? fieldErrors?.comment;
  const formError = fieldErrors?.form;

  const isEditing = initial !== undefined;

  function clearLocalError(field: FieldName) {
    setLocalErrors((previous) => {
      if (previous[field] === undefined) {
        return previous;
      }
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function handleCommentChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setComment(event.target.value);
    clearLocalError("comment");
  }

  function handleRatingChange(value: number) {
    setRating(value);
    clearLocalError("rating");
  }

  function focusFirstError(errors: Partial<Record<FieldName, string>>) {
    if (errors.rating !== undefined) {
      const radio = formRef.current?.elements.namedItem("rating");
      if (radio instanceof RadioNodeList) {
        radio[0]?.focus();
      }
      return;
    }
    if (errors.comment !== undefined) {
      const textarea = formRef.current?.elements.namedItem("comment");
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const parsed = createReviewInputSchema.safeParse({
      rating: rating === 0 ? undefined : rating,
      comment,
    });
    if (!parsed.success) {
      const errors = issuesToFieldErrors(parsed.error);
      const fieldErrorsForForm: Partial<Record<FieldName, string>> = {};
      if (errors.rating !== undefined) {
        fieldErrorsForForm.rating = errors.rating;
      }
      if (errors.comment !== undefined) {
        fieldErrorsForForm.comment = errors.comment;
      }
      setLocalErrors(fieldErrorsForForm);
      focusFirstError(fieldErrorsForForm);
      return;
    }
    setLocalErrors({});
    onSubmit(parsed.data);
  }

  const commentDescribedBy = [
    commentCountId,
    commentError !== undefined ? commentErrorId : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-border p-4"
    >
      <StarRatingInput
        name="rating"
        legend="Tu calificación"
        value={rating}
        onChange={handleRatingChange}
        disabled={submitting}
        invalid={ratingError !== undefined}
        describedBy={ratingError !== undefined ? ratingErrorId : undefined}
      />
      <FieldError id={ratingErrorId} message={ratingError} />

      <div className="space-y-2">
        <Label htmlFor={commentId}>Comentario</Label>
        <Textarea
          id={commentId}
          name="comment"
          rows={4}
          value={comment}
          onChange={handleCommentChange}
          disabled={submitting}
          aria-invalid={commentError !== undefined ? true : undefined}
          aria-describedby={commentDescribedBy}
        />
        <p
          id={commentCountId}
          className="text-right font-mono text-xs text-muted-foreground"
        >
          {comment.length}/{COMMENT_MAX_LENGTH}
        </p>
        <FieldError id={commentErrorId} message={commentError} />
      </div>

      {formError !== undefined && (
        <p id={formErrorId} role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting
            ? isEditing
              ? "Guardando…"
              : "Publicando…"
            : isEditing
              ? "Guardar cambios"
              : "Publicar reseña"}
        </Button>
        {onCancel !== undefined && (
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
