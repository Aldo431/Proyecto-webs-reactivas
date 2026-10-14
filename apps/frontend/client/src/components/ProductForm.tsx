import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  PRODUCT_CATEGORIES,
  type CreateProductInput,
  type UpdateProductInput,
} from "@tiendadcc/utils";
import { resolveImageUrl } from "../logic/productImage.ts";
import {
  browserImageDeps,
  processImageFile,
  type ProcessImageResult,
} from "../logic/imageProcessing.ts";
import {
  EMPTY_PRODUCT_FORM,
  FIELD_ORDER,
  buildCreateInput,
  buildUpdateInput,
  type FieldErrors,
  type ProductFormField,
  type ProductFormValues,
} from "../logic/productForm.ts";
import { TextField } from "./TextField.tsx";
import { Button } from "./ui/button.tsx";
import { Label } from "./ui/label.tsx";
import { Textarea } from "./ui/textarea.tsx";
import { cn } from "@/lib/utils";

const MAX_DESCRIPTION_LENGTH = 1000;

export type ProductSubmitResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

interface ProductFormBaseProps {
  submitLabel: string;
  submittingLabel: string;
  // Inyectable para testear sin canvas (jsdom no lo implementa).
  processImage?: (file: File) => Promise<ProcessImageResult>;
}

// One component for both modes (008 RF-18, RF-20): creating sends every field
// (`CreateProductInput`); editing sends only what changed and omits the image
// when it was not replaced (`UpdateProductInput`).
type ProductFormProps = ProductFormBaseProps &
  (
    | {
        mode: "create";
        onSubmit: (input: CreateProductInput) => Promise<ProductSubmitResult>;
      }
    | {
        mode: "edit";
        initialValues: ProductFormValues;
        onSubmit: (input: UpdateProductInput) => Promise<ProductSubmitResult>;
      }
  );

function defaultProcessImage(file: File): Promise<ProcessImageResult> {
  return processImageFile(file, browserImageDeps);
}

function isProductField(name: string): name is ProductFormField {
  return (FIELD_ORDER as readonly string[]).includes(name);
}

type PreparedSubmit =
  | { ok: true; send: () => Promise<ProductSubmitResult> }
  | { ok: false; fieldErrors: FieldErrors; formError?: string | undefined };

const selectClassName =
  "border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

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

// Product form (008 RF-18): presentation and UI state only. Validation goes
// through `buildCreateInput` (shared Zod schema), image processing is
// injected, and the submit result (including backend 400/413 messages) is
// mapped back to the fields without losing what the user typed.
export function ProductForm(props: ProductFormProps) {
  const { submitLabel, submittingLabel, processImage = defaultProcessImage } =
    props;
  const initialValues =
    props.mode === "edit" ? props.initialValues : EMPTY_PRODUCT_FORM;
  const ids = useId();
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);

  const descriptionErrorId = `${ids}-description-error`;
  const counterId = `${ids}-description-count`;
  const categoryErrorId = `${ids}-category-error`;
  const imageErrorId = `${ids}-image-error`;
  const imageHintId = `${ids}-image-hint`;
  const hasPreview = values.image !== null;

  function clearError(field: ProductFormField) {
    setErrors((previous) => {
      if (previous[field] === undefined) {
        return previous;
      }
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function handleTextChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;
    if (!isProductField(name) || name === "image") {
      return;
    }
    setValues((previous) => ({ ...previous, [name]: value }));
    clearError(name);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }
    setProcessing(true);
    clearError("image");
    const result = await processImage(file);
    setProcessing(false);
    // Allows choosing the same file again after an error.
    input.value = "";
    if (result.ok) {
      setValues((previous) => ({ ...previous, image: result.dataUrl }));
    } else {
      setErrors((previous) => ({ ...previous, image: result.message }));
      focusField("image", { image: result.message });
    }
  }

  function focusField(field: ProductFormField, fieldErrors: FieldErrors) {
    if (fieldErrors[field] === undefined) {
      return false;
    }
    if (field === "image") {
      (hasPreview ? changeButtonRef : fileInputRef).current?.focus();
      return true;
    }
    const element = formRef.current?.elements.namedItem(field);
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      element.focus();
      return true;
    }
    return false;
  }

  function focusFirstError(fieldErrors: FieldErrors) {
    for (const field of FIELD_ORDER) {
      if (focusField(field, fieldErrors)) {
        return;
      }
    }
  }

  // Validates for the current mode; on success `send` calls the right handler
  // with the right input type.
  function prepareSubmit(): PreparedSubmit {
    if (props.mode === "create") {
      const onSubmit = props.onSubmit;
      const built = buildCreateInput(values);
      return built.ok
        ? { ok: true, send: () => onSubmit(built.input) }
        : built;
    }
    const onSubmit = props.onSubmit;
    const built = buildUpdateInput(values, initialValues);
    return built.ok ? { ok: true, send: () => onSubmit(built.input) } : built;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || processing) {
      return;
    }
    const built = prepareSubmit();
    if (!built.ok) {
      setErrors(built.fieldErrors);
      setFormError(built.formError ?? null);
      if (Object.keys(built.fieldErrors).length > 0) {
        focusFirstError(built.fieldErrors);
      } else {
        setTimeout(() => formErrorRef.current?.focus(), 0);
      }
      return;
    }

    setErrors({});
    setFormError(null);
    submittingRef.current = true;
    setSubmitting(true);
    const result = await built.send();
    submittingRef.current = false;
    setSubmitting(false);

    if (result.ok) {
      return;
    }
    const fieldErrors: FieldErrors = {};
    for (const field of FIELD_ORDER) {
      const message = result.fieldErrors?.[field];
      if (message !== undefined) {
        fieldErrors[field] = message;
      }
    }
    setErrors(fieldErrors);
    setFormError(result.message);
    if (Object.keys(fieldErrors).length > 0) {
      // The disabled fields are enabled again after this render.
      setTimeout(() => focusFirstError(fieldErrors), 0);
    } else {
      setTimeout(() => formErrorRef.current?.focus(), 0);
    }
  }

  const busy = submitting || processing;
  const descriptionDescribedBy =
    [counterId, errors.description !== undefined ? descriptionErrorId : null]
      .filter((id): id is string => id !== null)
      .join(" ");

  return (
    <form
      ref={formRef}
      className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      noValidate
      aria-busy={busy}
      onSubmit={handleSubmit}
    >
      <TextField
        label="Nombre"
        name="name"
        type="text"
        value={values.name}
        onChange={handleTextChange}
        disabled={submitting}
        error={errors.name}
      />

      <div className="space-y-2">
        <Label htmlFor={`${ids}-description`}>Descripción</Label>
        <Textarea
          id={`${ids}-description`}
          name="description"
          rows={4}
          value={values.description}
          onChange={handleTextChange}
          disabled={submitting}
          aria-invalid={errors.description !== undefined ? true : undefined}
          aria-describedby={descriptionDescribedBy}
        />
        <p
          id={counterId}
          className="text-right font-mono text-xs text-muted-foreground"
        >
          {values.description.length}/{MAX_DESCRIPTION_LENGTH}
        </p>
        <FieldError id={descriptionErrorId} message={errors.description} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${ids}-category`}>Categoría</Label>
        <select
          id={`${ids}-category`}
          name="category"
          value={values.category}
          onChange={handleTextChange}
          disabled={submitting}
          className={selectClassName}
          aria-invalid={errors.category !== undefined ? true : undefined}
          aria-describedby={
            errors.category !== undefined ? categoryErrorId : undefined
          }
        >
          <option value="">Selecciona una categoría</option>
          {PRODUCT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <FieldError id={categoryErrorId} message={errors.category} />
      </div>

      <TextField
        label="Precio (CLP)"
        name="price"
        type="text"
        inputMode="numeric"
        value={values.price}
        onChange={handleTextChange}
        disabled={submitting}
        error={errors.price}
      />

      <div className="space-y-2">
        <Label htmlFor={`${ids}-image`}>Imagen</Label>
        {values.image !== null && (
          <img
            src={resolveImageUrl(values.image)}
            alt="Vista previa de la imagen"
            className="max-h-64 w-full rounded-md border border-border object-contain"
          />
        )}
        <input
          ref={fileInputRef}
          id={`${ids}-image`}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={submitting}
          tabIndex={hasPreview ? -1 : undefined}
          aria-invalid={errors.image !== undefined ? true : undefined}
          aria-describedby={
            [imageHintId, errors.image !== undefined ? imageErrorId : null]
              .filter((id): id is string => id !== null)
              .join(" ")
          }
          className={cn(
            "block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
            hasPreview && "sr-only",
          )}
        />
        {hasPreview && (
          <Button
            ref={changeButtonRef}
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => fileInputRef.current?.click()}
          >
            Cambiar imagen
          </Button>
        )}
        <p id={imageHintId} className="text-xs text-muted-foreground">
          JPG, PNG o WebP. Se reducirá a 1200 px y 1 MB como máximo.
        </p>
        {processing && (
          <p role="status" className="text-sm text-muted-foreground">
            Procesando imagen…
          </p>
        )}
        <FieldError id={imageErrorId} message={errors.image} />
      </div>

      {formError !== null && (
        <p
          ref={formErrorRef}
          role="alert"
          tabIndex={-1}
          className="text-sm text-destructive outline-none"
        >
          {formError}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={busy}
        aria-busy={submitting}
      >
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
