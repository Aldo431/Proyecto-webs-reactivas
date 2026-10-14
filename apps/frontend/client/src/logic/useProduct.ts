import type { Product } from "@tiendadcc/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ProductResult, fetchProduct } from "./productApi.ts";

export type ProductState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "success"; product: Product };

export interface ProductHook {
  state: ProductState;
  retry: () => void;
}

export type ProductLoader = (id: string) => Promise<ProductResult>;

// Loads one product by id for the detail page (spec 008, RF-14): loading, not
// found (404), error (network or server) and success. While the id changes, the
// previous product is never shown under the new URL.
export function useProduct(
  id: string,
  load: ProductLoader = fetchProduct,
): ProductHook {
  const [state, setState] = useState<ProductState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const isLoading = useRef(true);

  useEffect(() => {
    let isCurrent = true;
    isLoading.current = true;
    setState({ status: "loading" });

    load(id).then((result) => {
      if (!isCurrent) return;
      isLoading.current = false;
      if (result.ok) {
        setState({ status: "success", product: result.product });
      } else if (result.notFound) {
        setState({ status: "notFound" });
      } else {
        setState({ status: "error", message: result.message });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [id, load, attempt]);

  const retry = useCallback(() => {
    if (isLoading.current) return;
    setAttempt((previous) => previous + 1);
  }, []);

  const staleProduct = state.status === "success" && state.product.id !== id;
  return { state: staleProduct ? { status: "loading" } : state, retry };
}
