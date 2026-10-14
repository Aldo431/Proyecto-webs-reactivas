/*
 * Origen: código propio de tiendaDCC (spec 008, RF-18, RF-20).
 * Estado del formulario de producto y su traducción a la entrada de la API,
 * validada con los esquemas compartidos de `@tiendadcc/utils`.
 */
import {
  createProductInputSchema,
  updateProductInputSchema,
  type CreateProductInput,
  type Product,
  type ProductCategory,
  type UpdateProductInput,
} from "@tiendadcc/utils";
import { issuesToFieldErrors } from "./formErrors.ts";

// Orden visual de los campos: el foco va al primero con error.
export const FIELD_ORDER = [
  "name",
  "description",
  "category",
  "price",
  "image",
] as const;

export type ProductFormField = (typeof FIELD_ORDER)[number];

export interface ProductFormValues {
  name: string;
  description: string;
  category: ProductCategory | "";
  // Texto tal como lo escribe el usuario; se convierte con `parsePriceInput`.
  price: string;
  // Data URL ya procesado (o la URL actual al editar), o null sin imagen.
  image: string | null;
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  description: "",
  category: "",
  price: "",
  image: null,
};

export type FieldErrors = Partial<Record<ProductFormField, string>>;

export type BuildResult<T> =
  | { ok: true; input: T }
  | { ok: false; fieldErrors: FieldErrors; formError?: string | undefined };

export type PriceParseResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

export function valuesFromProduct(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description,
    category: product.category,
    price: String(product.price),
    image: product.image,
  };
}

// Solo dígitos: sin puntos de miles, comas ni decimales.
export function parsePriceInput(raw: string): PriceParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, message: "Ingresa un precio válido." };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      message: "Ingresa el precio como número entero, sin puntos ni decimales.",
    };
  }
  return { ok: true, value: Number(trimmed) };
}

function toFieldErrors(
  errors: Record<string, string>,
  priceError: string | null,
): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const field of FIELD_ORDER) {
    const message = errors[field];
    if (message !== undefined) {
      fieldErrors[field] = message;
    }
  }
  if (priceError !== null) {
    fieldErrors.price = priceError;
  }
  return fieldErrors;
}

export function buildCreateInput(
  values: ProductFormValues,
): BuildResult<CreateProductInput> {
  const price = parsePriceInput(values.price);
  const parsed = createProductInputSchema.safeParse({
    name: values.name,
    description: values.description,
    category: values.category === "" ? undefined : values.category,
    price: price.ok ? price.value : undefined,
    image: values.image ?? undefined,
  });
  if (!parsed.success || !price.ok) {
    return {
      ok: false,
      fieldErrors: toFieldErrors(
        parsed.success ? {} : issuesToFieldErrors(parsed.error),
        price.ok ? null : price.message,
      ),
    };
  }
  return { ok: true, input: parsed.data };
}

// Envía solo lo que cambió respecto de `initial`; la imagen se omite si no se
// eligió una nueva (el backend conserva la actual, RF-10).
export function buildUpdateInput(
  values: ProductFormValues,
  initial: ProductFormValues,
): BuildResult<UpdateProductInput> {
  const price = parsePriceInput(values.price);
  const candidate: Record<string, unknown> = {};
  if (values.name !== initial.name) candidate.name = values.name;
  if (values.description !== initial.description) {
    candidate.description = values.description;
  }
  if (values.category !== initial.category) {
    candidate.category = values.category === "" ? undefined : values.category;
  }
  if (values.price !== initial.price) {
    candidate.price = price.ok ? price.value : undefined;
  }
  if (values.image !== initial.image && values.image !== null) {
    candidate.image = values.image;
  }

  const parsed = updateProductInputSchema.safeParse(candidate);
  const priceError = !price.ok && "price" in candidate ? price.message : null;
  const fieldErrors = toFieldErrors(
    parsed.success ? {} : issuesToFieldErrors(parsed.error),
    priceError,
  );
  if (values.category === "") {
    fieldErrors.category = "Selecciona una categoría válida.";
  }
  if (!parsed.success || priceError !== null || values.category === "") {
    // Issues without a field (e.g. "No hay cambios para guardar.") become a
    // form-level message.
    const formError = parsed.success
      ? undefined
      : parsed.error.issues.find((issue) => issue.path.length === 0)?.message;
    return { ok: false, fieldErrors, formError };
  }
  return { ok: true, input: parsed.data };
}
