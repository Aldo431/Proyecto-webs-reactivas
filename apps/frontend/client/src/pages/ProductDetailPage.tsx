import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleAlert, Heart } from "lucide-react";
import { Header } from "../components/Header.tsx";
import { ReviewList } from "../components/ReviewList.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { resolveImageUrl } from "../logic/productImage.ts";
import {
  addFavorite,
  fetchProfile,
  recordVisit,
  removeFavorite,
} from "../logic/profileApi.ts";
import { useProduct } from "../logic/useProduct.ts";

export function ProductDetailPage() {
  // Reads the :id segment of the URL and loads the product from the API; an
  // unknown id (404) renders the not-found state below.
  const { id } = useParams();
  const productId = id ?? "";
  const { state: productState, retry } = useProduct(productId);
  const { addItem, openCart } = useCart();
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [variantError, setVariantError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (productState.status === "success" && productState.product.variants.length === 1) {
      setSelectedVariantId(productState.product.variants[0]?.id ?? "");
    } else {
      setSelectedVariantId("");
    }
    setVariantError(null);
  }, [productState]);

  const product =
    productState.status === "success" ? productState.product : undefined;
  // The owner manages the product instead of buying it (008 RF-14).
  const isOwner =
    product !== undefined &&
    authState.status === "authenticated" &&
    authState.user.id === product.seller.id;

  // Registra la visita solo con sesión y producto existente, sin bloquear el
  // render, y carga el estado inicial del favorito (RF-10).
  useEffect(() => {
    if (authState.status !== "authenticated" || product === undefined) {
      return;
    }
    void recordVisit(product.id);
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
  }, [authState, product]);

  async function handleToggleFavorite(): Promise<void> {
    if (product === undefined || toggling) {
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

  if (productState.status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p role="status" className="text-muted-foreground">
            Cargando producto…
          </p>
        </main>
      </div>
    );
  }

  if (productState.status === "error") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <div
            role="alert"
            className="flex flex-col items-start gap-4 rounded-xl border border-destructive p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-center gap-2 font-sans text-destructive">
              <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
              No pudimos cargar el producto.
            </p>
            <Button variant="outline" onClick={retry}>
              Reintentar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (product === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Producto no encontrado
          </h1>
          <p className="mt-2 text-muted-foreground">
            El producto que buscas no existe o ya no está disponible.
          </p>
        </main>
      </div>
    );
  }

  const selectedVariant = product.variants.find(
    (variant) => variant.id === selectedVariantId,
  );
  const displayedPrice =
    product.price + (selectedVariant?.priceAdjustment ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <img
            src={resolveImageUrl(product.image)}
            alt={product.name}
            className="w-full rounded-2xl object-cover"
          />
          <div>
            <Badge variant="secondary" className="font-mono">
              {product.category}
            </Badge>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              {product.name}
            </h1>
            <p className="mt-2 font-mono text-xl font-bold text-card-foreground">
              {formatPriceCLP(displayedPrice)}
            </p>
            <p className="mt-4 text-muted-foreground">{product.description}</p>
            {product.variants.length > 0 && (
              <div className="mt-6">
                <label
                  htmlFor="product-variant"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Variante
                </label>
                <select
                  id="product-variant"
                  value={selectedVariantId}
                  aria-describedby={variantError === null ? undefined : "variant-error"}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => {
                    setSelectedVariantId(event.target.value);
                    setVariantError(null);
                  }}
                >
                  {product.variants.length > 1 && (
                    <option value="">Selecciona una variante</option>
                  )}
                  {product.variants.map((variant) => (
                    <option
                      key={variant.id}
                      value={variant.id}
                      disabled={variant.stock === 0}
                    >
                      {variant.name} {variant.stock === 0 ? "(Agotada)" : `(${variant.stock} disponibles)`}
                    </option>
                  ))}
                </select>
                {variantError !== null && (
                  <p id="variant-error" role="alert" className="mt-2 text-sm text-destructive">
                    {variantError}
                  </p>
                )}
              </div>
            )}
            <p className="mt-4 font-sans text-sm text-muted-foreground">
              Publicado por {product.seller.displayName}
            </p>
            {isOwner ? (
              <div className="mt-6">
                <Button asChild>
                  <Link to={`/publicaciones/${product.id}/editar`}>
                    Editar publicación
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-6 flex items-center gap-2">
                  <Button
                    variant="default"
                    type="button"
                    disabled={
                      product.variants.every((variant) => variant.stock === 0)
                    }
                    onClick={() => {
                      const variant = product.variants.find(
                        (entry) => entry.id === selectedVariantId,
                      );
                      if (variant === undefined || variant.stock === 0) {
                        setVariantError(
                          "Selecciona una variante disponible.",
                        );
                        return;
                      }
                      addItem({
                        id: product.id,
                        name: product.name,
                        price:
                          product.price + (variant.priceAdjustment ?? 0),
                        image: product.image,
                        variantId: variant.id,
                        variantName: variant.name,
                        stock: variant.stock,
                      });
                      openCart();
                    }}
                  >
                    Agregar al carrito
                  </Button>
                  <Button
                    variant="outline"
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
                  >
                    <Heart
                      aria-hidden="true"
                      fill={isFavorite ? "currentColor" : "none"}
                    />
                    {isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                  </Button>
                </div>
                {favoriteError !== null && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {favoriteError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <ReviewList productId={product.id} />
      </main>
    </div>
  );
}
