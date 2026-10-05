import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.tsx";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import type { Product } from "../logic/productParse.ts";
import { productPath } from "../logic/productPath.ts";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { Card, CardContent } from "./ui/card.tsx";

interface ProductCardProps {
  product: Product;
}

// The card links to the product detail (002 RF-1); the quick "Agregar"
// button sits outside the Link so no interactive element is nested inside
// another one (004 RF-3). Both show the formatted CLP price.
export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();

  return (
    <div className="flex h-full flex-col gap-2">
      <Link
        to={productPath(product.id)}
        className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Card className="h-full gap-4 overflow-hidden pt-0 transition-colors duration-(--duration-fast) ease-(--ease-standard) group-hover:border-primary">
          <img
            src={product.image}
            alt={product.name}
            className="h-48 w-full object-cover"
          />
          <CardContent className="flex flex-col items-start gap-2">
            <Badge variant="secondary" className="font-mono">
              {product.category}
            </Badge>
            <h3 className="text-lg font-semibold text-card-foreground">
              {product.name}
            </h3>
            <p className="font-mono text-sm font-bold text-card-foreground">
              {formatPriceCLP(product.price)}
            </p>
            <p className="font-sans text-sm text-muted-foreground">
              {product.description}
            </p>
          </CardContent>
        </Card>
      </Link>
      <Button
        variant="outline"
        size="sm"
        type="button"
        aria-label={`Agregar ${product.name} al carrito`}
        onClick={() => {
          addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
          });
          openCart();
        }}
      >
        Agregar
      </Button>
    </div>
  );
}
