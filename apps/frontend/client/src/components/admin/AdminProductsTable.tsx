import type { AdminProduct } from "@tiendadcc/utils";
import { Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, formatRating } from "../../logic/adminFormat.ts";
import {
  deleteProductDescription,
} from "../../logic/adminMessages.ts";
import { formatPriceCLP } from "../../logic/cartCalculations.ts";
import { ConfirmDeleteDialog } from "../ConfirmDeleteDialog.tsx";
import { Button } from "../ui/button.tsx";
import { AdminThumbnail } from "./AdminThumbnail.tsx";
import { FeaturedSwitch } from "./FeaturedSwitch.tsx";

interface AdminProductsTableProps {
  products: AdminProduct[];
  /** Ids con una solicitud de "destacar" en curso: su interruptor se bloquea. */
  pendingIds: ReadonlySet<string>;
  onToggleFeatured: (product: AdminProduct) => void;
  onDelete: (product: AdminProduct) => Promise<void>;
}

const HEADER = "px-3 py-2 font-medium whitespace-nowrap";

// Tabla de productos de todos los vendedores (spec 013, RF-11). Vive dentro de
// un contenedor con `overflow-x-auto`: en pantallas angostas se desplaza la
// tabla, no la página (RNF-6).
export function AdminProductsTable({
  products,
  pendingIds,
  onToggleFeatured,
  onDelete,
}: AdminProductsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className={HEADER}>Producto</th>
            <th scope="col" className={HEADER}>Vendedor</th>
            <th scope="col" className={`${HEADER} text-right`}>Precio</th>
            <th scope="col" className={HEADER}>Reseñas</th>
            <th scope="col" className={HEADER}>Publicado</th>
            <th scope="col" className={HEADER}>Destacado</th>
            <th scope="col" className={HEADER}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-border align-middle">
              <td className="px-3 py-2">
                <span className="flex items-center gap-3">
                  <AdminThumbnail image={product.image} />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium break-words">
                      {product.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {product.category}
                    </span>
                  </span>
                </span>
              </td>
              <td className="px-3 py-2 font-mono">@{product.seller.username}</td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {formatPriceCLP(product.price)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <Reviews product={product} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {formatDate(product.createdAt)}
              </td>
              <td className="px-3 py-2">
                <FeaturedSwitch
                  checked={product.featured}
                  disabled={pendingIds.has(product.id)}
                  label={`Destacar «${product.name}»`}
                  onToggle={() => onToggleFeatured(product)}
                />
              </td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      to={`/producto/${product.id}`}
                      aria-label={`Ver ${product.name}`}
                    >
                      <Eye aria-hidden="true" />
                    </Link>
                  </Button>
                  <ConfirmDeleteDialog
                    productName={product.name}
                    description={deleteProductDescription(
                      product.name,
                      product.seller.username,
                    )}
                    onConfirm={() => onDelete(product)}
                  />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// "★ 4,3 (3)" o "—". El texto visible es decorativo para lectores de
// pantalla: se les da la frase completa.
function Reviews({ product }: { product: AdminProduct }) {
  if (product.reviewCount === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const average = formatRating(product.averageRating);
  return (
    <>
      <span aria-hidden="true" className="font-mono">
        ★ {average} <span className="text-muted-foreground">({product.reviewCount})</span>
      </span>
      <span className="sr-only">
        {`${average} de 5 estrellas, ${product.reviewCount} reseñas`}
      </span>
    </>
  );
}
