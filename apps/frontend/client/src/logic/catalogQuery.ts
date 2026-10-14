import { SORT_ORDERS, type ProductCategory } from "@tiendadcc/utils";
import {
  CATEGORY_PARAM,
  parseCategoryParam,
  toCategorySlug,
} from "./categoryParam.ts";

export const SEARCH_PARAM = "q";
export const SORT_PARAM = "orden";
export const PAGE_PARAM = "pagina";
export const MIN_PRICE_PARAM = "min";
export const MAX_PRICE_PARAM = "max";

export type SortOrder = (typeof SORT_ORDERS)[number];

export const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio-menor", label: "Precio: menor a mayor" },
  { value: "precio-mayor", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre A–Z" },
];

export const SEARCH_DEBOUNCE_MS = 300;

export interface CatalogQuery {
  q: string;
  orden: SortOrder;
  pagina: number;
  min: number | null;
  max: number | null;
  categoria: ProductCategory | null;
}

export const CATALOG_DEFAULTS: CatalogQuery = {
  q: "",
  orden: "recientes",
  pagina: 1,
  min: null,
  max: null,
  categoria: null,
};

function isSortOrder(value: string | null): value is SortOrder {
  return (
    value !== null &&
    (SORT_ORDERS as readonly string[]).includes(value)
  );
}

function parsePageParam(rawValue: string | null): number {
  if (rawValue === null || rawValue.trim() === "") return 1;
  const value = Number(rawValue);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

function parsePriceParam(rawValue: string | null): number | null {
  if (rawValue === null || rawValue.trim() === "") return null;
  const value = Number(rawValue);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

// Reads the catalog URL into a query. Every invalid value silently falls back
// to its default (spec 009, RF-7); the API keeps answering 400 for the same
// inputs, each layer with its own contract.
export function parseCatalogParams(
  params: URLSearchParams,
  categories: readonly string[],
): CatalogQuery {
  const rawQ = params.get(SEARCH_PARAM);
  const trimmedQ = rawQ === null ? "" : rawQ.trim();
  const q = trimmedQ.length > 100 ? "" : trimmedQ;
  const rawOrden = params.get(SORT_PARAM);
  const orden = isSortOrder(rawOrden) ? rawOrden : "recientes";
  const pagina = parsePageParam(params.get(PAGE_PARAM));
  const min = parsePriceParam(params.get(MIN_PRICE_PARAM));
  const max = parsePriceParam(params.get(MAX_PRICE_PARAM));
  const validRange = min === null || max === null || min <= max;
  // La categoría calzó con la lista conocida, así que el cast es seguro (y la
  // API la valida de nuevo de todos modos).
  const categoria = parseCategoryParam(
    params.get(CATEGORY_PARAM),
    categories,
  ) as ProductCategory | null;
  return {
    q,
    orden,
    pagina,
    min: validRange ? min : null,
    max: validRange ? max : null,
    categoria,
  };
}

// Serializes a query back to URL parameters, omitting every default value so
// shared links stay short (spec 009, RF-7).
export function buildCatalogParams(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q !== "") {
    params.set(SEARCH_PARAM, query.q);
  }
  if (query.orden !== "recientes") {
    params.set(SORT_PARAM, query.orden);
  }
  if (query.pagina !== 1) {
    params.set(PAGE_PARAM, String(query.pagina));
  }
  if (query.min !== null) {
    params.set(MIN_PRICE_PARAM, String(query.min));
  }
  if (query.max !== null) {
    params.set(MAX_PRICE_PARAM, String(query.max));
  }
  if (query.categoria !== null) {
    params.set(CATEGORY_PARAM, toCategorySlug(query.categoria));
  }
  return params;
}
