import type { Product } from "@tiendadcc/utils";
import { formatDate } from "../../logic/adminFormat.ts";
import { formatPriceCLP } from "../../logic/cartCalculations.ts";
import { AdminThumbnail } from "./AdminThumbnail.tsx";

interface LatestProductsTableProps {
  products: Product[];
}

// "Últimas publicaciones" del Resumen (spec 013, RF-10). La tabla se desplaza
// dentro de su contenedor, no en la página (RNF-6).
export function LatestProductsTable({ products }: LatestProductsTableProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay productos publicados.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">Producto</th>
            <th scope="col" className="px-3 py-2 font-medium">Categoría</th>
            <th scope="col" className="px-3 py-2 font-medium">Vendedor</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Precio</th>
            <th scope="col" className="py-2 pl-3 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-border">
              <td className="py-2 pr-3">
                <span className="flex items-center gap-3">
                  <AdminThumbnail image={product.image} />
                  <span className="font-medium">{product.name}</span>
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {product.category}
              </td>
              <td className="px-3 py-2 font-mono">@{product.seller.username}</td>
              <td className="px-3 py-2 text-right font-mono">
                {formatPriceCLP(product.price)}
              </td>
              <td className="py-2 pl-3 whitespace-nowrap text-muted-foreground">
                {formatDate(product.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
