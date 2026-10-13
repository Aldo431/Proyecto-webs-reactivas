import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/Header.tsx";
import { Button } from "../components/ui/button.tsx";
import { FavoriteToggle } from "../components/FavoriteToggle.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import productsJson from "../data/products.json";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { getProductById } from "../logic/productLookup.ts";
import { parseProducts } from "../logic/productParse.ts";
import {
  addFavorite,
  fetchProfile,
  recordVisit,
  removeFavorite,
} from "../logic/profileApi.ts";

const productCatalog = parseProducts(productsJson);

export function ProductDetailPage() {
  // Reads the :id segment of the URL and looks the product up in the
  // catalog; an unknown id renders the not-found state below.
  const { id } = useParams();
  const productId = id ?? "";
  const { addItem, openCart } = useCart();
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  const product = getProductById(productCatalog, productId);

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

  if (product === undefined) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header showBackButton={true} backLabel="Volver al inicio" />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-brand-900">
            Producto no encontrado
          </h1>
          <p className="mt-2 text-slate-600">
            El producto que buscas no existe o ya no está disponible.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header showBackButton={true} backLabel="Volver al inicio" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <img
            src={product.image}
            alt={product.name}
            className="w-full rounded-2xl object-cover"
          />
          <div>
            <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {product.category}
            </span>
            <h1 className="mt-2 text-3xl font-bold text-brand-900">
              {product.name}
            </h1>
            <p className="mt-2 font-mono text-xl font-bold text-card-foreground">
              {formatPriceCLP(product.price)}
            </p>
            <p className="mt-4 text-slate-600">{product.description}</p>
            <div className="mt-6 flex items-center gap-2">
              <Button
                variant="default"
                type="button"
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
                Agregar al carrito
              </Button>
              <FavoriteToggle
                productName={product.name}
                isFavorite={isFavorite}
                disabled={toggling || authState.status === "loading"}
                onToggle={() => {
                  void handleToggleFavorite();
                }}
              />
            </div>
            {favoriteError !== null && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {favoriteError}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
