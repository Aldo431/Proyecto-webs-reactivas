import type { UpdateProductInput } from "@tiendadcc/utils";
import { CircleAlert } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/Header.tsx";
import {
  ProductForm,
  type ProductSubmitResult,
} from "../components/ProductForm.tsx";
import { Button } from "../components/ui/button.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import type { ProcessImageResult } from "../logic/imageProcessing.ts";
import { updateProduct } from "../logic/productApi.ts";
import { valuesFromProduct } from "../logic/productForm.ts";
import { UPDATED_NOTICE, noticeState } from "../logic/publicationNotice.ts";
import { useProduct } from "../logic/useProduct.ts";

interface EditProductPageProps {
  // Injectable for tests (jsdom has no canvas).
  processImage?: (file: File) => Promise<ProcessImageResult>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-xl flex-col px-4 py-14">
        {children}
      </main>
    </div>
  );
}

function BlockedMessage({ message }: { message: string }) {
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold text-foreground">
        Editar publicación
      </h1>
      <p role="alert" className="text-destructive">
        {message}
      </p>
      <Button asChild variant="link" className="mt-2 self-start px-0">
        <Link to="/mis-publicaciones">Mis publicaciones</Link>
      </Button>
    </>
  );
}

// /publicaciones/:id/editar (008 RF-20): protected by OnlyAuthenticatedRoute.
// Only the owner sees the form; the server still enforces ownership.
export function EditProductPage({ processImage }: EditProductPageProps) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, retry } = useProduct(id);

  if (state.status === "loading") {
    return (
      <Shell>
        <p role="status" className="py-14 text-center text-muted-foreground">
          Cargando publicación…
        </p>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-xl border border-destructive p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2 text-destructive">
            <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
            No pudimos cargar la publicación.
          </p>
          <Button variant="outline" onClick={retry}>
            Reintentar
          </Button>
        </div>
      </Shell>
    );
  }

  if (state.status === "notFound") {
    return (
      <Shell>
        <BlockedMessage message="Producto no encontrado." />
      </Shell>
    );
  }

  const product = state.product;
  if (user === null || user.id !== product.seller.id) {
    return (
      <Shell>
        <BlockedMessage message="No puedes editar esta publicación." />
      </Shell>
    );
  }

  async function handleSubmit(
    input: UpdateProductInput,
  ): Promise<ProductSubmitResult> {
    const result = await updateProduct(product.id, input);
    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        ...(result.fieldErrors !== undefined
          ? { fieldErrors: result.fieldErrors }
          : {}),
      };
    }
    navigate("/mis-publicaciones", { state: noticeState(UPDATED_NOTICE) });
    return { ok: true };
  }

  return (
    <Shell>
      <h1 className="mb-8 text-3xl font-bold text-foreground">
        Editar publicación
      </h1>
      <ProductForm
        key={product.id}
        mode="edit"
        initialValues={valuesFromProduct(product)}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        onSubmit={handleSubmit}
        {...(processImage !== undefined ? { processImage } : {})}
      />
    </Shell>
  );
}
