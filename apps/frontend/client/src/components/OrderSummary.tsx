import {
  calculateItemSubtotal,
  formatPriceCLP,
} from "../logic/cartCalculations.ts";
import type { CartItem } from "../logic/cartTypes.ts";
import { resolveImageUrl } from "../logic/productImage.ts";

interface OrderSummaryProps {
  items: CartItem[];
  totalAmount: number;
}

// Resumen de solo lectura del pedido (011 RF-3): misma información que el
// drawer (miniatura, nombre, cantidad, subtotal por línea y total en CLP),
// sin controles de edición.
export function OrderSummary({ items, totalAmount }: OrderSummaryProps) {
  return (
    <section
      aria-labelledby="order-summary-title"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2
        id="order-summary-title"
        className="font-mono text-lg font-bold text-card-foreground"
      >
        Resumen de compra
      </h2>
      <ul className="mt-2 divide-y divide-border">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3 py-3">
            <img
              src={resolveImageUrl(item.image)}
              alt={item.name}
              className="h-16 w-16 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-sm font-medium text-card-foreground">
                {item.name}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatPriceCLP(item.price)} × {item.quantity}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm text-card-foreground">
              {formatPriceCLP(
                calculateItemSubtotal(item.price, item.quantity),
              )}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <span className="font-sans text-sm text-muted-foreground">Total</span>
        <span className="font-mono text-lg font-bold text-card-foreground">
          {formatPriceCLP(totalAmount)}
        </span>
      </div>
    </section>
  );
}
