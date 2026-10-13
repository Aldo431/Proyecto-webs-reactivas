import { Heart, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import type { Product } from "../logic/productParse.ts";
import { productPath } from "../logic/productPath.ts";
import {
  addFavorite,
  fetchProfile,
  removeFavorite,
} from "../logic/profileApi.ts";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { Card, CardContent } from "./ui/card.tsx";

interface ProductCardProps {
  product: Product;
}

// The card links to the product detail (002 RF-1); the cart and favorite
// icon buttons overlay the image as siblings of the Link (never nested
// inside it) on a surface background so they stay visible with or without
// hover (007 RF-6, touch included). Both show the formatted CLP price.
export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    if (authState.status !== "authenticated") {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const profile = await fetchProfile();
      if (!cancelled) {
        setIsFavorite(profile?.favorites.includes(product.id) ?? false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authState, product.id]);

  async function handleToggleFavorite(): Promise<void> {
    if (toggling) {
      return;
    }
    if (authState.status !== "authenticated") {
      navigate("/iniciar-sesion");
      return;
    }
    setToggling(true);
    setFavoriteError(null);
    const result = isFavorite
      ? await removeFavorite(product.id)
      : await addFavorite(product.id);
    if (result.ok) {
      setIsFavorite(!isFavorite);
    } else {
      setFavoriteError(result.message);
    }
    setToggling(false);
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <Card className="relative h-full gap-4 overflow-hidden pt-0 transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-primary">
        <Link
          to={productPath(product.id)}
          className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
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
        </Link>
        <div className="absolute top-2 right-2 flex gap-1 rounded-full bg-card/95 p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon-sm"
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
            className="transition-transform duration-(--duration-fast) ease-(--ease-standard) hover:scale-110 motion-reduce:transition-none"
          >
            <ShoppingCart aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-pressed={isFavorite}
            aria-label={
              isFavorite
                ? `Quitar ${product.name} de favoritos`
                : `Agregar ${product.name} a favoritos`
            }
            disabled={toggling || authState.status === "loading"}
            onClick={() => {
              void handleToggleFavorite();
            }}
            className="transition-transform duration-(--duration-fast) ease-(--ease-standard) hover:scale-110 motion-reduce:transition-none"
          >
            <Heart
              aria-hidden="true"
              fill={isFavorite ? "currentColor" : "none"}
            />
          </Button>
        </div>
      </Card>
      {favoriteError !== null && (
        <p role="alert" className="text-sm text-destructive">
          {favoriteError}
        </p>
      )}
    </div>
  );
}
