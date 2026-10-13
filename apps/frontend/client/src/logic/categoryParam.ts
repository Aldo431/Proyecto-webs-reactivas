import { PRODUCT_CATEGORIES } from "@tiendadcc/utils";
import { z } from "zod";

// Category shortcuts shown on the home page (Home RF-6). Same list as the
// catalog filters and the API (spec 008, RF-1).
export const CATEGORY_SHORTCUTS = PRODUCT_CATEGORIES;

// URL parameter that carries the active catalog filter (Home RF-6).
export const CATEGORY_PARAM = "categoria";

// A slug is lowercase ASCII letters and digits, optionally joined by single
// hyphens: "tazas", "accesorios-tecnicos". Anything else (uppercase, spaces,
// percent-encoding, markup) is rejected.
const categorySlugSchema = z
  .string()
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// "Accesorios Técnicos" -> "accesorios-tecnicos": lowercase, accents removed,
// every run of other characters collapsed into one hyphen.
export function toCategorySlug(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Validates the raw `categoria` value read from the URL and maps it to one of
// the existing categories. Returns null ("Todas") when the value is missing,
// malformed or matches no category.
export function parseCategoryParam(
  rawValue: string | null,
  categories: readonly string[],
): string | null {
  const parsed = categorySlugSchema.safeParse(rawValue);
  if (!parsed.success) return null;
  const match = categories.find(
    (category) => toCategorySlug(category) === parsed.data,
  );
  return match ?? null;
}

// Catalog path filtered by the given category, e.g. "/catalogo?categoria=tazas".
export function catalogPathForCategory(category: string): string {
  const params = new URLSearchParams({
    [CATEGORY_PARAM]: toCategorySlug(category),
  });
  return `/catalogo?${params.toString()}`;
}
