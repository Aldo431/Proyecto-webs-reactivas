import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext.tsx";
import { calculateItemSubtotal, formatPriceCLP } from "../logic/cartCalculations.ts";
import type { CartItem } from "../logic/cartTypes.ts";
import { Button } from "./ui/button.tsx";

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart();
  const subtotal = calculateItemSubtotal(item.price, item.quantity);

  return (
    <li className="flex gap-3 border-b border-border py-4 last:border-b-0">
      <img
        src={item.image}
        alt={item.name}
        className="h-16 w-16 shrink-0 rounded-md object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-sans text-sm font-medium text-card-foreground">
          {item.name}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {formatPriceCLP(item.price)} c/u
        </p>
        <div className="mt-1 flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            type="button"
            aria-label={`Disminuir cantidad de ${item.name}`}
            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <span
            className="min-w-6 text-center font-mono text-sm"
            aria-label={`Cantidad: ${item.quantity}`}
          >
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            type="button"
            aria-label={`Aumentar cantidad de ${item.name}`}
            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            type="button"
            aria-label={`Eliminar ${item.name} del carrito`}
            onClick={() => removeItem(item.productId)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      <p className="shrink-0 font-mono text-sm text-card-foreground">
        {formatPriceCLP(subtotal)}
      </p>
    </li>
  );
}
