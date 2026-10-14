import {
  type FeaturedProductsSource,
  fetchFeaturedProducts,
} from "./productRepository.ts";
import {
  type ProductListHook,
  type ProductListState,
  useProductList,
} from "./useProductList.ts";

export type FeaturedProductsState = ProductListState;

export type FeaturedProductsResult = ProductListHook;

// The home page's featured products: the generic list hook with the featured
// source as default (Home RF-5, RF-7).
export function useFeaturedProducts(
  source: FeaturedProductsSource = fetchFeaturedProducts,
): FeaturedProductsResult {
  return useProductList(source);
}
