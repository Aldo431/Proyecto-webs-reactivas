import {
  ADMIN_REVIEW_RATING_FILTERS,
  ADMIN_REVIEW_SORT_ORDERS,
  PRODUCT_CATEGORIES,
  SEARCH_MAX_LENGTH,
  USER_ROLES,
  type ProductCategory,
  type UserRole,
} from "@tiendadcc/utils";
import { parsePageParam } from "./catalogQuery.ts";

// Filtros de las secciones del panel (spec 013, RF-11 a RF-13). Viven en la
// URL (`?q=…&categoria=…&pagina=2`) y son los mismos nombres que usa la API,
// así que un solo serializador sirve para la URL y para la llamada. Todo valor
// inválido de la URL cae al valor por defecto; la API sigue respondiendo 400
// ante los mismos valores, cada capa con su contrato.

export const SEARCH_PARAM = "q";
export const CATEGORY_PARAM = "categoria";
export const FEATURED_PARAM = "destacados";
export const ROLE_PARAM = "rol";
export const RATING_PARAM = "calificacion";
export const SORT_PARAM = "orden";
export const PAGE_PARAM = "pagina";

export type ReviewRatingFilter = (typeof ADMIN_REVIEW_RATING_FILTERS)[number];
export type ReviewSortOrder = (typeof ADMIN_REVIEW_SORT_ORDERS)[number];

export interface AdminProductsQuery {
  q: string;
  categoria: ProductCategory | null;
  destacados: boolean;
  pagina: number;
}

export interface AdminUsersQuery {
  q: string;
  rol: UserRole | null;
  pagina: number;
}

export interface AdminReviewsQuery {
  calificacion: ReviewRatingFilter | null;
  orden: ReviewSortOrder;
  pagina: number;
}

export const ADMIN_PRODUCTS_DEFAULTS: AdminProductsQuery = {
  q: "",
  categoria: null,
  destacados: false,
  pagina: 1,
};

export const ADMIN_USERS_DEFAULTS: AdminUsersQuery = {
  q: "",
  rol: null,
  pagina: 1,
};

export const ADMIN_REVIEWS_DEFAULTS: AdminReviewsQuery = {
  calificacion: null,
  orden: "recientes",
  pagina: 1,
};

export const ADMIN_ROLE_OPTIONS: ReadonlyArray<{
  value: UserRole | null;
  label: string;
}> = [
  { value: null, label: "Todos" },
  { value: "admin", label: "Administradores" },
  { value: "user", label: "Usuarios" },
];

export const ADMIN_REVIEW_RATING_OPTIONS: ReadonlyArray<{
  value: ReviewRatingFilter | null;
  label: string;
}> = [
  { value: null, label: "Todas" },
  { value: "bajas", label: "1–2 estrellas" },
  { value: "altas", label: "4–5 estrellas" },
];

export const ADMIN_REVIEW_SORT_OPTIONS: ReadonlyArray<{
  value: ReviewSortOrder;
  label: string;
}> = [
  { value: "recientes", label: "Más recientes" },
  { value: "menor", label: "Menor calificación" },
];

function oneOf<T extends string>(
  value: string | null,
  options: readonly T[],
): T | null {
  return value !== null && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function parseSearch(params: URLSearchParams): string {
  const trimmed = (params.get(SEARCH_PARAM) ?? "").trim();
  return trimmed.length > SEARCH_MAX_LENGTH ? "" : trimmed;
}

export function parseAdminProductsParams(
  params: URLSearchParams,
): AdminProductsQuery {
  return {
    q: parseSearch(params),
    categoria: oneOf(params.get(CATEGORY_PARAM), PRODUCT_CATEGORIES),
    destacados: params.get(FEATURED_PARAM) === "true",
    pagina: parsePageParam(params.get(PAGE_PARAM)),
  };
}

// Serializa omitiendo los valores por defecto, para URLs cortas.
export function buildAdminProductsParams(
  query: AdminProductsQuery,
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q !== "") params.set(SEARCH_PARAM, query.q);
  if (query.categoria !== null) params.set(CATEGORY_PARAM, query.categoria);
  if (query.destacados) params.set(FEATURED_PARAM, "true");
  if (query.pagina !== 1) params.set(PAGE_PARAM, String(query.pagina));
  return params;
}

export function parseAdminUsersParams(params: URLSearchParams): AdminUsersQuery {
  return {
    q: parseSearch(params),
    rol: oneOf(params.get(ROLE_PARAM), USER_ROLES),
    pagina: parsePageParam(params.get(PAGE_PARAM)),
  };
}

export function buildAdminUsersParams(query: AdminUsersQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q !== "") params.set(SEARCH_PARAM, query.q);
  if (query.rol !== null) params.set(ROLE_PARAM, query.rol);
  if (query.pagina !== 1) params.set(PAGE_PARAM, String(query.pagina));
  return params;
}

export function parseAdminReviewsParams(
  params: URLSearchParams,
): AdminReviewsQuery {
  return {
    calificacion: oneOf(params.get(RATING_PARAM), ADMIN_REVIEW_RATING_FILTERS),
    orden:
      oneOf(params.get(SORT_PARAM), ADMIN_REVIEW_SORT_ORDERS) ?? "recientes",
    pagina: parsePageParam(params.get(PAGE_PARAM)),
  };
}

export function buildAdminReviewsParams(
  query: AdminReviewsQuery,
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.calificacion !== null) {
    params.set(RATING_PARAM, query.calificacion);
  }
  if (query.orden !== "recientes") params.set(SORT_PARAM, query.orden);
  if (query.pagina !== 1) params.set(PAGE_PARAM, String(query.pagina));
  return params;
}

// Cambiar un filtro vuelve a la página 1 (RF-11); cambiar solo la página no.
export function changeFilters<Query extends { pagina: number }>(
  query: Query,
  changes: Partial<Omit<Query, "pagina">>,
): Query {
  return { ...query, ...changes, pagina: 1 };
}

export function changePage<Query extends { pagina: number }>(
  query: Query,
  pagina: number,
): Query {
  return { ...query, pagina };
}
