import { Link } from "react-router-dom";
import type { Product } from "../logic/productParse.ts";
import { productPath } from "../logic/productPath.ts";
import { Badge } from "./ui/badge.tsx";
import { Card, CardContent } from "./ui/card.tsx";

interface ProductCardProps {
  product: Product;
}

// The whole card is one link to the product detail (002 RF-1), built on the
// Card and Badge primitives with design-system tokens only (Home RF-4).
export function ProductCard({ product }: ProductCardProps) {
  return (
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
          <p className="font-sans text-sm text-muted-foreground">
            {product.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
