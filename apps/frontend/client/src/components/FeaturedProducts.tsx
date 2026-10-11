import { CircleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { DURATION_S } from "../logic/motionTokens.ts";
import type { FeaturedProductsSource } from "../logic/productRepository.ts";
import { useFeaturedProducts } from "../logic/useFeaturedProducts.ts";
import { BlurFade } from "./magicui/blur-fade.tsx";
import { ProductCard } from "./ProductCard.tsx";
import { Button } from "./ui/button.tsx";

interface FeaturedProductsProps {
  // Injected by tests; the page uses the default data source (Home RF-7).
  source?: FeaturedProductsSource;
}

// "Destacados" section (Home RF-4). Its own grid instead of ProductGrid, so
// the catalog stays untouched in this phase (plan D12). Cards enter once,
// staggered: duration `base`, delay `index × fast` (DS RF-6, RF-7). While
// loading, on error or with no featured products, a state message replaces
// the grid (Home RF-5); the heading and "Ver más productos" always stay.
export function FeaturedProducts({ source }: FeaturedProductsProps) {
  const { state, retry } = useFeaturedProducts(source);

  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto max-w-6xl px-4 py-14"
    >
      <h2
        id="featured-heading"
        className="mb-8 text-3xl font-bold text-foreground"
      >
        Destacados
      </h2>
      {state.status === "loading" && (
        <p role="status" className="font-sans text-muted-foreground">
          Cargando productos destacados…
        </p>
      )}
      {state.status === "error" && (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-xl border border-destructive p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2 font-sans text-destructive">
            <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
            No pudimos cargar los productos destacados.
          </p>
          <Button variant="outline" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}
      {state.status === "success" && state.products.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="font-sans text-muted-foreground">
            Aún no hay productos destacados.
          </p>
          <Button asChild variant="link" className="px-0">
            <Link to="/catalogo">Ver catálogo completo</Link>
          </Button>
        </div>
      )}
      {state.status === "success" && state.products.length > 0 && (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {state.products.map((product, index) => (
            <li key={product.id}>
              <BlurFade
                inView
                duration={DURATION_S.base}
                delay={index * DURATION_S.fast}
                className="h-full"
              >
                <ProductCard product={product} />
              </BlurFade>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-10 text-center">
        <Button asChild variant="outline" size="lg">
          <Link to="/catalogo">Ver más productos</Link>
        </Button>
      </div>
    </section>
  );
}
