import type { Product } from "@tiendadcc/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SEARCH_DEBOUNCE_MS,
  type CatalogQuery,
} from "./catalogQuery.ts";
import { fetchCatalogPage } from "./productApi.ts";

export type CatalogPageState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "success";
      products: Product[];
      total: number;
      pagina: number;
      totalPaginas: number;
    };

export interface CatalogPageHook {
  state: CatalogPageState;
  retry: () => void;
}

// Loads one catalog page from the backend for the given query. Only the
// search text is debounced; every other change requests immediately. Late
// answers from older requests are discarded (spec 009, RF-6).
export function useCatalogPage(query: CatalogQuery): CatalogPageHook {
  const [debouncedQ, setDebouncedQ] = useState<string>(query.q);
  const [state, setState] = useState<CatalogPageState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const isLoading = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(query.q);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [query.q]);

  const { orden, pagina, min, max, categoria } = query;

  useEffect(() => {
    let isCurrent = true;
    isLoading.current = true;
    setState({ status: "loading" });
    fetchCatalogPage({
      ...(debouncedQ === "" ? {} : { q: debouncedQ }),
      orden,
      pagina,
      ...(min === null ? {} : { min }),
      ...(max === null ? {} : { max }),
      ...(categoria === null ? {} : { categoria }),
    }).then(
      (result) => {
        if (!isCurrent) return;
        isLoading.current = false;
        if (result.ok) {
          setState({
            status: "success",
            products: result.page.products,
            total: result.page.total,
            pagina: result.page.pagina,
            totalPaginas: result.page.totalPaginas,
          });
        } else {
          setState({ status: "error" });
        }
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
  }, [debouncedQ, orden, pagina, min, max, categoria, attempt]);

  const retry = useCallback(() => {
    if (isLoading.current) return;
    isLoading.current = true;
    setState({ status: "loading" });
    setAttempt((previous) => previous + 1);
  }, []);

  return { state, retry };
}
