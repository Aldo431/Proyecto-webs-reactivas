import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Header } from "../components/Header.tsx";
import productsJson from "../data/products.json";
import { getProductById } from "../logic/productLookup.ts";
import { parseProducts } from "../logic/productParse.ts";

const productCatalog = parseProducts(productsJson);

export function ProductDetailPage() {
  // Reads the :id segment of the URL and looks the product up in the
  // catalog; an unknown id renders the not-found state below.
  const { id } = useParams();
  const productId = id ?? "";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  const product = getProductById(productCatalog, productId);

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
            <p className="mt-4 text-slate-600">{product.description}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
