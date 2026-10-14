import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header.tsx";
import {
  ProductForm,
  type ProductSubmitResult,
} from "../components/ProductForm.tsx";
import type { CreateProductInput } from "@tiendadcc/utils";
import type { ProcessImageResult } from "../logic/imageProcessing.ts";
import { createProduct } from "../logic/productApi.ts";
import { PUBLISHED_NOTICE, noticeState } from "../logic/publicationNotice.ts";

interface PublishProductPageProps {
  // Injectable for tests (jsdom has no canvas).
  processImage?: (file: File) => Promise<ProcessImageResult>;
}

// /publicar (008 RF-18): protected by OnlyAuthenticatedRoute in App.tsx. On
// success it goes to "Mis publicaciones" with a notice.
export function PublishProductPage({ processImage }: PublishProductPageProps) {
  const navigate = useNavigate();

  async function handleSubmit(
    input: CreateProductInput,
  ): Promise<ProductSubmitResult> {
    const result = await createProduct(input);
    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        ...(result.fieldErrors !== undefined
          ? { fieldErrors: result.fieldErrors }
          : {}),
      };
    }
    navigate("/mis-publicaciones", { state: noticeState(PUBLISHED_NOTICE) });
    return { ok: true };
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-xl flex-col px-4 py-14">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
          Publicar producto
        </h1>
        <ProductForm
          mode="create"
          submitLabel="Publicar"
          submittingLabel="Publicando…"
          onSubmit={handleSubmit}
          {...(processImage !== undefined ? { processImage } : {})}
        />
      </main>
    </div>
  );
}
