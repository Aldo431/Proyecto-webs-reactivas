import { formatPriceCLP } from "../logic/cartCalculations.ts";
import type { PricingQuoteState } from "../logic/usePricingQuote.ts";

interface CartSummaryProps {
  state: PricingQuoteState;
}

export function CartSummary({ state }: CartSummaryProps) {
  if (state.status === "loading") {
    return (
      <p role="status" className="font-sans text-sm text-muted-foreground">
        Calculando precio…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="font-sans text-sm text-destructive">
        {state.message}
      </p>
    );
  }

  return (
    <dl className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <dt className="font-sans text-sm text-muted-foreground">Subtotal</dt>
        <dd className="font-mono text-sm text-card-foreground">
          {formatPriceCLP(state.quote.subtotal)}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt className="font-sans text-sm text-muted-foreground">Ahorro</dt>
        <dd className="font-mono text-sm text-terminal-success">
          {formatPriceCLP(state.quote.savings)}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
        <dt className="font-sans text-sm font-medium text-card-foreground">
          Total
        </dt>
        <dd className="font-mono text-lg font-bold text-card-foreground">
          {formatPriceCLP(state.quote.total)}
        </dd>
      </div>
    </dl>
  );
}
