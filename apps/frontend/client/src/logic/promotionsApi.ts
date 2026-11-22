import { promotionSchema, type Promotion } from "@tiendadcc/utils";
import { z } from "zod";
import type { ApiFailure } from "./apiFailure.ts";
import {
  apiPath,
  failureFromResponse,
  networkFailure,
  unexpectedResponseFailure,
} from "./apiFailure.ts";

export type PromotionsResult = { ok: true; promotions: Promotion[] } | ApiFailure;

const promotionsResponseSchema = z.array(promotionSchema);

export async function fetchPromotions(): Promise<PromotionsResult> {
  try {
    const response = await fetch(apiPath("/api/promotions"), {
      method: "GET",
      credentials: "include",
    });
    if (response.status === 200) {
      const parsed = promotionsResponseSchema.safeParse(await response.json());
      return parsed.success
        ? { ok: true, promotions: parsed.data }
        : unexpectedResponseFailure();
    }
    return failureFromResponse(
      response,
      "No se pudieron cargar las promociones.",
    );
  } catch {
    return networkFailure(
      "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    );
  }
}
