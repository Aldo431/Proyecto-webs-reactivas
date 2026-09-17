import { useNavigate } from "react-router-dom";
import { AuthBar } from "../components/AuthBar.tsx";
import { Header } from "../components/Header.tsx";
import { ProductGrid } from "../components/ProductGrid.tsx";
import productsJson from "../data/products.json";
import {
  FEATURED_PRODUCT_COUNT,
  getFeaturedProducts,
} from "../logic/productLookup.ts";
import { parseProducts } from "../logic/productParse.ts";

const productCatalog = parseProducts(productsJson);
const featuredProducts = getFeaturedProducts(
  productCatalog,
  FEATURED_PRODUCT_COUNT,
);

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header showBackButton={false} />
      <main>
        <section className="bg-linear-to-br from-brand-800 to-brand-950 py-20 text-center">
          <div className="mx-auto max-w-3xl px-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-white">
              TiendaDCC
            </h1>
            <p className="mt-4 text-lg text-brand-100">
              Venta de productos del DCC.
            </p>
            <div className="mt-8">
              <AuthBar />
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate("/catalogo")}
                className="rounded-full border-2 border-white/80 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Ver Catálogo
              </button>
            </div>
          </div>
        </section>
        <ProductGrid products={featuredProducts} />
        <div className="pb-14 text-center">
          <button
            type="button"
            onClick={() => navigate("/catalogo")}
            className="rounded-full bg-brand-800 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700"
          >
            Ver más productos
          </button>
        </div>
      </main>
    </div>
  );
}
