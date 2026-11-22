import {
  PACK_2X15_MIN_QUANTITY,
  PACK_2X15_PERCENT,
  PACK_3X2_GROUP_SIZE,
  STUDENT_DISCOUNT_PERCENT,
  type Discount,
  type PricingLine,
  type PricingLineResult,
  type PricingQuote,
  type Promotion,
} from "./promotionSchemas.ts";

export interface PricedLine extends PricingLine {
  unitPrice: number;
}

interface DiscountOptions {
  isStudent: boolean;
  promotions: Promotion[];
}

function hasPromotion(promotions: Promotion[], type: Promotion["type"]): boolean {
  return promotions.some((promotion) => promotion.type === type);
}

export function bestDiscountForLine(
  unitPrice: number,
  quantity: number,
  options: DiscountOptions,
): Discount | null {
  const candidates: Discount[] = [];

  if (options.isStudent && hasPromotion(options.promotions, "studentDiscount")) {
    candidates.push({
      type: "studentDiscount",
      label: `${STUDENT_DISCOUNT_PERCENT}% de descuento para alumnos`,
      amount: Math.round((unitPrice * quantity * STUDENT_DISCOUNT_PERCENT) / 100),
    });
  }

  if (
    quantity >= PACK_3X2_GROUP_SIZE &&
    hasPromotion(options.promotions, "quantityPack3x2")
  ) {
    const freeUnits = Math.floor(quantity / PACK_3X2_GROUP_SIZE);
    candidates.push({
      type: "quantityPack3x2",
      label: "Pack 3x2",
      amount: freeUnits * unitPrice,
    });
  }

  if (
    quantity >= PACK_2X15_MIN_QUANTITY &&
    hasPromotion(options.promotions, "quantityPack2x15")
  ) {
    candidates.push({
      type: "quantityPack2x15",
      label: "2 unidades con 15% de descuento",
      amount: Math.round((unitPrice * quantity * PACK_2X15_PERCENT) / 100),
    });
  }

  let best: Discount | null = null;
  for (const candidate of candidates) {
    if (best === null || candidate.amount > best.amount) {
      best = candidate;
    }
  }
  return best;
}

export function calculatePricingQuote(
  lines: PricedLine[],
  promotions: Promotion[],
  isStudent: boolean,
): PricingQuote {
  const results: PricingLineResult[] = lines.map((line) => {
    const discount = bestDiscountForLine(line.unitPrice, line.quantity, {
      isStudent,
      promotions,
    });
    const subtotal = line.unitPrice * line.quantity;
    return {
      productId: line.productId,
      ...(line.variantId === undefined ? {} : { variantId: line.variantId }),
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      subtotal: discount === null ? subtotal : subtotal - discount.amount,
      discount,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const savings = results.reduce(
    (sum, line) => sum + (line.discount?.amount ?? 0),
    0,
  );

  return {
    subtotal,
    discounts: results.flatMap((line) =>
      line.discount === null ? [] : [line.discount],
    ),
    total: subtotal - savings,
    savings,
  };
}
