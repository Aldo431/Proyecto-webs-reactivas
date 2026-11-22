import {
  pricingQuoteInputSchema,
  pricingQuoteSchema,
  type PricingLine,
  type PricingQuote,
} from "@tiendadcc/utils";
import type { ApiFailure } from "./apiFailure.ts";
import {
  apiPath,
  failureFromIssues,
  failureFromResponse,
  networkFailure,
  unexpectedResponseFailure,
} from "./apiFailure.ts";

export type QuoteResult = { ok: true; quote: PricingQuote } | ApiFailure;

export async function fetchPricingQuote(items: PricingLine[]): Promise<QuoteResult> {
  const lines: PricingLine[] = items.map((item) => ({
    productId: item.productId,
    ...(item.variantId === undefined ? {} : { variantId: item.variantId }),
    quantity: item.quantity,
  }));
  const input = pricingQuoteInputSchema.safeParse({ items: lines });
  if (!input.success) return failureFromIssues(input.error);

  try {
    const response = await fetch(apiPath("/api/pricing/quote"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input.data),
    });
    if (response.status === 200) {
      const parsed = pricingQuoteSchema.safeParse(await response.json());
      return parsed.success
        ? { ok: true, quote: parsed.data }
        : unexpectedResponseFailure();
    }
    const fallback =
      response.status === 401
        ? "Inicia sesión para ver tus descuentos."
        : response.status === 429
          ? "Has excedido el límite de solicitudes. Intenta más tarde."
          : response.status === 503
            ? "El servicio no está disponible en este momento. Inténtalo más tarde."
            : "No se pudo calcular el precio. Intenta más tarde.";
    return failureFromResponse(response, fallback);
  } catch {
    return networkFailure(
      "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    );
  }
}
