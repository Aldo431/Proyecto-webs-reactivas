import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog.tsx";
import { Header } from "../components/Header.tsx";
import { ProductCard } from "../components/ProductCard.tsx";
import { Button } from "../components/ui/button.tsx";
import { deleteProduct } from "../logic/productApi.ts";
import { fetchMyPublications } from "../logic/productRepository.ts";
import {
  DELETED_NOTICE,
  readNotice,
} from "../logic/publicationNotice.ts";
import { useProductList } from "../logic/useProductList.ts";

// /mis-publicaciones (008 RF-19): protected by OnlyAuthenticatedRoute. The
// card is the existing ProductCard without the shop buttons; edit and delete
// actions sit under it.
export function MyProductsPage() {
  const { state, retry } = useProductList(fetchMyPublications);
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(() =>
    readNotice(location.state),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The arrival notice is shown once: it is cleared from the history entry so
  // a reload or coming back does not repeat it.
  useEffect(() => {
    if (readNotice(location.state) !== null) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  async function handleDelete(id: string): Promise<void> {
    setActionError(null);
    setNotice(null);
    const result = await deleteProduct(id);
    if (result.ok) {
      setRemovedIds((previous) => [...previous, id]);
      setNotice(DELETED_NOTICE);
      // The row that held the focus disappears; move it somewhere stable.
      headingRef.current?.focus();
    } else {
      setActionError(result.message);
    }
  }

  const products =
    state.status === "success"
      ? state.products.filter((product) => !removedIds.includes(product.id))
      : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-bold text-foreground outline-none"
          >
            Mis publicaciones
          </h1>
          <Button asChild>
            <Link to="/publicar">Publicar producto</Link>
          </Button>
        </div>

        <div role="status" className="mt-4 empty:hidden">
          {notice !== null && (
            <p className="text-terminal-success">
              <span aria-hidden="true">✓ </span>
              {notice}
            </p>
          )}
        </div>
        {actionError !== null && (
          <p role="alert" className="mt-4 text-destructive">
            {actionError}
          </p>
        )}

        {state.status === "loading" && (
          <p role="status" className="py-14 text-center text-muted-foreground">
            Cargando publicaciones…
          </p>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="mt-8 flex flex-col items-start gap-4 rounded-xl border border-destructive p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-center gap-2 text-destructive">
              <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
              No se pudieron cargar tus publicaciones.
            </p>
            <Button variant="outline" onClick={retry}>
              Reintentar
            </Button>
          </div>
        )}
        {state.status === "success" &&
          (products.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-muted-foreground">
                Aún no publicas productos.
              </p>
              <Button asChild className="mt-4">
                <Link to="/publicar">Publicar producto</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.id} className="flex flex-col gap-2">
                  <ProductCard product={product} showShopActions={false} />
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={`/publicaciones/${encodeURIComponent(product.id)}/editar`}
                        aria-label={`Editar ${product.name}`}
                      >
                        Editar
                      </Link>
                    </Button>
                    <ConfirmDeleteDialog
                      productName={product.name}
                      onConfirm={() => handleDelete(product.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </main>
    </div>
  );
}
