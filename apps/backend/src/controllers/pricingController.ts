import type { RequestHandler } from "express";
import { pricingQuoteInputSchema } from "@tiendadcc/utils";
import { quoteForUser } from "../services/pricingService.ts";

export const quotePrices: RequestHandler = async (request, response) => {
  const input = pricingQuoteInputSchema.parse(request.body);
  const result = await quoteForUser(request.user?.id, input.items);
  response.status(200).json(result.quote);
};
