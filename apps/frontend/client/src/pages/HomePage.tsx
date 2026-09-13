import { AuthBar } from "../components/AuthBar.tsx";
import { Header } from "../components/Header.tsx";
import { ProductGrid } from "../components/ProductGrid.tsx";
import productsJson from "../data/products.json";
import { parseProducts } from "../logic/productParse.ts";

const productCatalog = parseProducts(productsJson);

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header showBackButton={false} />
      <main>
        <section className="bg-gradient-to-br from-brand-800 to-brand-950 py-20 text-center">
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
          </div>
        </section>
        <ProductGrid products={productCatalog} />
      </main>
    </div>
  );
}