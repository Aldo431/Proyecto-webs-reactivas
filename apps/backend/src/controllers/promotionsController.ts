import type { RequestHandler } from "express";
import { promotionInputSchema } from "@tiendadcc/utils";
import {
  createPromotion,
  deactivatePromotion,
  listActivePromotions,
  updatePromotion,
} from "../services/promotionService.ts";

export const listPromotions: RequestHandler = async (_request, response) => {
  response.status(200).json(await listActivePromotions());
};

export const createPromotionHandler: RequestHandler = async (request, response) => {
  const input = promotionInputSchema.parse(request.body);
  response.status(201).json(await createPromotion(input));
};

export const updatePromotionHandler: RequestHandler<{ id: string }> = async (
  request,
  response,
) => {
  const input = promotionInputSchema.parse(request.body);
  response.status(200).json(await updatePromotion(request.params.id, input));
};

export const deactivatePromotionHandler: RequestHandler<{ id: string }> = async (
  request,
  response,
) => {
  response.status(200).json(await deactivatePromotion(request.params.id));
};
