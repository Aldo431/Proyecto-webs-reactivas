import type { Promotion, PromotionInput } from "@tiendadcc/utils";
import { HttpError } from "../errors.ts";
import {
  Promotion as PromotionModel,
  toPublicPromotion,
  type PromotionFields,
} from "../models/Promotion.ts";
import { isObjectIdString } from "./productService.ts";

const NOT_FOUND_MESSAGE = "La promoción no existe.";

interface PromotionLike extends PromotionFields {
  _id: { toString(): string };
}

function toPublic(promotion: PromotionLike): Promotion {
  return toPublicPromotion(promotion);
}

function toDate(value: string | null | undefined): Date | null {
  return value === undefined || value === null ? null : new Date(value);
}

export async function listActivePromotions(now = new Date()): Promise<Promotion[]> {
  const promotions = await PromotionModel.find({
    active: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ createdAt: -1 })
    .lean<PromotionLike[]>();
  return promotions.map(toPublic);
}

export async function listAllPromotions(): Promise<Promotion[]> {
  const promotions = await PromotionModel.find()
    .sort({ createdAt: -1 })
    .lean<PromotionLike[]>();
  return promotions.map(toPublic);
}

export async function createPromotion(input: PromotionInput): Promise<Promotion> {
  const promotion = await PromotionModel.create({
    type: input.type,
    label: input.label,
    active: input.active,
    percent: input.percent ?? null,
    startsAt: toDate(input.startsAt),
    endsAt: toDate(input.endsAt),
  });
  return toPublic(promotion as unknown as PromotionLike);
}

export async function updatePromotion(
  id: string,
  input: PromotionInput,
): Promise<Promotion> {
  if (!isObjectIdString(id)) {
    throw new HttpError(404, NOT_FOUND_MESSAGE);
  }
  const promotion = await PromotionModel.findById(id);
  if (!promotion) {
    throw new HttpError(404, NOT_FOUND_MESSAGE);
  }
  promotion.type = input.type;
  promotion.label = input.label;
  promotion.active = input.active;
  promotion.percent = input.percent ?? null;
  promotion.startsAt = toDate(input.startsAt);
  promotion.endsAt = toDate(input.endsAt);
  await promotion.save();
  return toPublic(promotion as unknown as PromotionLike);
}

export async function deactivatePromotion(id: string): Promise<Promotion> {
  if (!isObjectIdString(id)) {
    throw new HttpError(404, NOT_FOUND_MESSAGE);
  }
  const promotion = await PromotionModel.findByIdAndUpdate(
    id,
    { active: false },
    { new: true },
  ).lean<PromotionLike | null>();
  if (!promotion) {
    throw new HttpError(404, NOT_FOUND_MESSAGE);
  }
  return toPublic(promotion);
}

export async function seedDefaultPromotions(): Promise<number> {
  const defaults = [
    {
      type: "studentDiscount" as const,
      label: "20% de descuento para alumnos",
      percent: 20,
    },
    { type: "quantityPack3x2" as const, label: "Pack 3x2", percent: null },
    {
      type: "quantityPack2x15" as const,
      label: "2 unidades con 15% de descuento",
      percent: 15,
    },
  ];

  for (const item of defaults) {
    await PromotionModel.updateOne(
      { type: item.type },
      {
        $setOnInsert: {
          type: item.type,
          label: item.label,
          active: true,
          percent: item.percent,
          startsAt: null,
          endsAt: null,
        },
      },
      { upsert: true },
    );
  }
  return defaults.length;
}

