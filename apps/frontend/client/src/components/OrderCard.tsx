import { Badge } from "./ui/badge.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card.tsx";
import type { Order } from "@tiendadcc/utils";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { formatOrderDate } from "../logic/orderFormat.ts";
import { resolveImageUrl } from "../logic/productImage.ts";

interface OrderCardProps {
  order: Order;
}

// Tarjeta de solo lectura de un pedido (spec 012, RF-8): folio, fecha y hora
// en formato chileno, estado "Completado", líneas con snapshot (nombre,
// cantidad × precio unitario y subtotal) y total. Sin acciones de edición,
// cancelación ni eliminación (RF-5); una columna legible desde 360 px.
export function OrderCard({ order }: OrderCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-mono text-base text-card-foreground">
          {order.folio}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-muted-foreground">
            {formatOrderDate(order.createdAt)}
          </span>
          <Badge>Completado</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y divide-border">
          {order.items.map((item) => (
            <li
              key={`${order.id}-${item.productId}`}
              className="flex items-center gap-3 py-2"
            >
              <img
                src={resolveImageUrl(item.image)}
                alt={item.name}
                className="h-12 w-12 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm text-card-foreground">
                  {item.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {formatPriceCLP(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm text-card-foreground">
                {formatPriceCLP(item.subtotal)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="font-sans text-sm text-muted-foreground">
            Total
          </span>
          <span className="font-mono text-base font-bold text-card-foreground">
            {formatPriceCLP(order.total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
