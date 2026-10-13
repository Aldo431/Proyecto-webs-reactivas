import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { resolveImageUrl } from "../logic/productImage.ts";
import type { Product } from "../logic/productParse.ts";
import { Button } from "./ui/button.tsx";
import { Card, CardContent } from "./ui/card.tsx";

interface FavoriteProductCardProps {
  product: Product;
  viewedAtLabel?: string | undefined;
  onRemove?: ((productId: string) => void) | undefined;
  removeDisabled?: boolean | undefined;
}

// Mini-tarjeta compartida por favoritas e historial (spec 007, RF-8/RF-9):
// imagen, nombre con enlace al detalle y precio; en favoritas suma el botón
// "Eliminar" (papelera + texto) y en historial la fecha de visualización.
export function FavoriteProductCard({
  product,
  viewedAtLabel,
  onRemove,
  removeDisabled,
}: FavoriteProductCardProps) {
  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="flex items-center gap-3 p-3">
        <img
          src={resolveImageUrl(product.image)}
          alt=""
          aria-hidden="true"
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <Link
            to={`/producto/${product.id}`}
            className="truncate font-sans text-sm font-semibold text-primary hover:underline"
          >
            {product.name}
          </Link>
          <p className="font-mono text-sm font-bold text-card-foreground">
            {formatPriceCLP(product.price)}
          </p>
          {viewedAtLabel !== undefined && viewedAtLabel !== "" && (
            <p className="font-sans text-xs text-muted-foreground">
              Visto el {viewedAtLabel}
            </p>
          )}
          {onRemove !== undefined && (
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label={`Eliminar ${product.name} de favoritos`}
              disabled={removeDisabled}
              onClick={() => {
                onRemove(product.id);
              }}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
