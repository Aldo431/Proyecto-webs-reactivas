import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "./productParse.ts";
import {
  type FeaturedProductsSource,
  fetchFeaturedProducts,
} from "./productRepository.ts";

export type FeaturedProductsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; products: Product[] };

export interface FeaturedProductsResult {
  state: FeaturedProductsState;
  retry: () => void;
}

// Loads the featured products and exposes a discriminated state plus a retry
// action (Home RF-5, RF-7). The page never learns where the data comes from;
// tests inject `source`. `source` must be a stable reference (a module-level
// function), otherwise every render would start a new load.
export function useFeaturedProducts(
  source: FeaturedProductsSource = fetchFeaturedProducts,
): FeaturedProductsResult {
  const [state, setState] = useState<FeaturedProductsState>({
    status: "loading",
  });
  const [attempt, setAttempt] = useState(0);
  const isLoading = useRef(true);

  useEffect(() => {
    // Each load owns this flag; a newer load or an unmount turns it off so
    // a late answer from an older load is discarded.
    let isCurrent = true;
    isLoading.current = true;

    source().then(
      (products) => {
        if (!isCurrent) return;
        isLoading.current = false;
        setState({ status: "success", products });
      },
      () => {
        if (!isCurrent) return;
        isLoading.current = false;
        setState({ status: "error" });
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [source, attempt]);

  // Ignored while a load is in flight, so repeated clicks never queue
  // parallel loads.
  const retry = useCallback(() => {
    if (isLoading.current) return;
    isLoading.current = true;
    setState({ status: "loading" });
    setAttempt((previous) => previous + 1);
  }, []);

  return { state, retry };
}
