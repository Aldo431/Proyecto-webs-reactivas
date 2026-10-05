import productsJson from "../data/products.json";
import {
  FEATURED_PRODUCT_COUNT,
  selectFeaturedProducts,
} from "./productLookup.ts";
import { type Product, parseProducts } from "./productParse.ts";

// Where the home page gets its featured products from (Home RF-7). Callers
// only see this contract, never the data origin.
export type FeaturedProductsSource = () => Promise<Product[]>;

// Builds a source from a loader of raw JSON shaped like products.json
// (`{ products: Product[] }`). The data is validated with the Zod schema and
// reduced to the featured selection; the promise rejects if the loader
// rejects or the data is invalid (which drives the error state, Home RF-5).
//
// Switching to the API only means passing another loader, e.g.:
//   createFeaturedProductsSource(async () => {
//     const response = await fetch("/api/products?featured=true");
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return response.json();
//   });
export function createFeaturedProductsSource(
  loadRaw: () => Promise<unknown>,
): FeaturedProductsSource {
  return async () =>
    selectFeaturedProducts(
      parseProducts(await loadRaw()),
      FEATURED_PRODUCT_COUNT,
    );
}

// Current source: the catalog bundled with the app, so there is no network.
export const fetchFeaturedProducts: FeaturedProductsSource =
  createFeaturedProductsSource(() => Promise.resolve(productsJson));
