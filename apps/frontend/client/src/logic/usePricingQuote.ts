import { useEffect, useMemo, useState } from "react";
import { pricingQuoteInputSchema, type PricingLine, type PricingQuote } from "@tiendadcc/utils";
import { failureFromIssues } from "./apiFailure.ts";
import { fetchPricingQuote } from "./pricingApi.ts";
import { useAuthStore } from "../stores/authStore.ts";
import { useCartStore } from "../stores/cartStore.ts";

export type PricingQuoteState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; quote: PricingQuote };

export interface PricingQuoteHook {
  state: PricingQuoteState;
  retry: () => void;
}

export function usePricingQuote(items?: PricingLine[]): PricingQuoteHook {
  const cartItems = useCartStore((store) => store.items);
  const studentVerified = useAuthStore(
    (store) =>
      store.state.status === "authenticated" && store.state.user.studentVerified,
  );
  const lines = useMemo<PricingLine[]>(
    () =>
      (items ?? cartItems).map((item) => ({
        productId: item.productId,
        ...(item.variantId === undefined ? {} : { variantId: item.variantId }),
        quantity: item.quantity,
      })),
    [items, cartItems],
  );
  const quoteKey = JSON.stringify(lines);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PricingQuoteState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const input = pricingQuoteInputSchema.safeParse({ items: lines });
    if (!input.success) {
      const failure = failureFromIssues(input.error);
      setState({ status: "error", message: failure.message });
      return;
    }
    setState({ status: "loading" });
    void fetchPricingQuote(lines).then((result) => {
      if (!active) return;
      if (result.ok) {
        setState({ status: "success", quote: result.quote });
      } else {
        setState({ status: "error", message: result.message });
      }
    });
    return () => {
      active = false;
    };
  }, [quoteKey, studentVerified, attempt]);

  return {
    state,
    retry: () => {
      setAttempt((current) => current + 1);
    },
  };
}
