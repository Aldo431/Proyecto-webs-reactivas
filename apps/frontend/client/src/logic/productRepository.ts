import {
  FEATURED_PRODUCT_COUNT,
  selectFeaturedProducts,
} from "./productLookup.ts";
import {
  type ProductListResult,
  fetchMyProducts,
  fetchProducts,
} from "./productApi.ts";
import type { Product } from "@tiendadcc/utils";

// Where a page gets a list of products from. Callers only see this contract,
// never the data origin (Home RF-7, spec 008 RF-14).
export type ProductListSource = () => Promise<Product[]>;

// Where the home page gets its featured products from (Home RF-7).
export type FeaturedProductsSource = ProductListSource;

// Turns an API result into the promise the pages' hooks expect: a failure
// rejects, which drives the error state (Home RF-5).
async function unwrap(result: ProductListResult): Promise<Product[]> {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.products;
}

// Builds the featured source from a loader of already validated products
// (the API returns them under `?featured=true`). The selection still applies
// the `featured` flag and the cap, so the rule lives in one place (Home RF-8).
export function createFeaturedProductsSource(
  loadProducts: ProductListSource,
): FeaturedProductsSource {
  return async () =>
    selectFeaturedProducts(await loadProducts(), FEATURED_PRODUCT_COUNT);
}

export const fetchFeaturedProducts: FeaturedProductsSource =
  createFeaturedProductsSource(async () =>
    unwrap(await fetchProducts({ featured: true })),
  );

// The whole catalog, loaded once; the category filter runs locally (spec 008,
// RF-14).
export const fetchCatalogProducts: ProductListSource = async () =>
  unwrap(await fetchProducts());

// The signed-in user's own publications (spec 008, RF-19).
export const fetchMyPublications: ProductListSource = async () =>
  unwrap(await fetchMyProducts());
