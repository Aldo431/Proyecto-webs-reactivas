import { Schema, model } from "mongoose";
import {
  PROMOTION_TYPES,
  type Promotion as PublicPromotion,
  type PromotionType,
} from "@tiendadcc/utils";

export interface PromotionFields {
  type: PromotionType;
  label: string;
  active: boolean;
  percent: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const promotionSchema = new Schema<PromotionFields>(
  {
    type: {
      type: String,
      enum: { values: [...PROMOTION_TYPES], message: "Tipo de promoción inválido." },
      required: [true, "El tipo de promoción es obligatorio."],
      unique: true,
    },
    label: {
      type: String,
      required: [true, "La etiqueta es obligatoria."],
      trim: true,
      minlength: [1, "La etiqueta es obligatoria."],
    },
    active: {
      type: Boolean,
      default: true,
    },
    percent: {
      type: Number,
      required: false,
      default: null,
    },
    startsAt: {
      type: Date,
      required: false,
      default: null,
    },
    endsAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);

promotionSchema.index({ active: 1, startsAt: 1, endsAt: 1 });

export const Promotion = model<PromotionFields>("Promotion", promotionSchema);

export function toPublicPromotion(
  promotion: PromotionFields & { _id: { toString(): string } },
): PublicPromotion {
  return {
    id: promotion._id.toString(),
    type: promotion.type,
    label: promotion.label,
    active: promotion.active,
    startsAt: promotion.startsAt?.toISOString() ?? null,
    endsAt: promotion.endsAt?.toISOString() ?? null,
    createdAt: promotion.createdAt.toISOString(),
  };
}
