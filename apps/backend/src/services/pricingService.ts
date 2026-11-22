import type { ClientSession, Types } from "mongoose";
import {
  bestDiscountForLine,
  calculatePricingQuote,
  isStudentEmail,
  type OrderItemInput,
  type PricingLineResult,
  type PricingQuote,
} from "@tiendadcc/utils";
import { HttpError } from "../errors.ts";
import { Product } from "../models/Product.ts";
import { User } from "../models/User.ts";
import { isObjectIdString } from "./productService.ts";
import { listActivePromotions } from "./promotionService.ts";

export const PRODUCT_UNAVAILABLE_MESSAGE =
  "Uno de los productos de tu carrito ya no está disponible.";
export const VARIANT_OUT_OF_STOCK_MESSAGE =
  "La variante seleccionada no tiene stock suficiente.";

export interface PricingVariantRow {
  _id: Types.ObjectId;
  name: string;
  stock: number;
  priceAdjustment?: number;
}

export interface PricingProductRow {
  _id: Types.ObjectId;
  name: string;
  price: number;
  image: string;
  variants?: PricingVariantRow[];
}

export interface ResolvedPricingLine {
  productId: string;
  variantId?: string;
  product: PricingProductRow;
  variant?: PricingVariantRow;
  unitPrice: number;
  quantity: number;
}

interface ResolveOptions {
  session?: ClientSession;
  stockErrorStatus?: number;
}

export async function resolvePricingLines(
  items: OrderItemInput[],
  options: ResolveOptions = {},
): Promise<ResolvedPricingLine[]> {
  for (const item of items) {
    if (!isObjectIdString(item.productId)) {
      throw new HttpError(400, PRODUCT_UNAVAILABLE_MESSAGE);
    }
  }

  const products = await Product.find(
    { _id: { $in: items.map((item) => item.productId) } },
    { name: 1, price: 1, image: 1, variants: 1 },
  )
    .session(options.session ?? null)
    .lean<PricingProductRow[]>();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      throw new HttpError(400, PRODUCT_UNAVAILABLE_MESSAGE);
    }
    const variant = item.variantId === undefined
      ? product.variants?.[0]
      : product.variants?.find((candidate) => candidate._id.toString() === item.variantId);
    if (item.variantId !== undefined && variant === undefined) {
      throw new HttpError(400, PRODUCT_UNAVAILABLE_MESSAGE);
    }
    if (variant !== undefined && variant.stock < item.quantity) {
      throw new HttpError(
        options.stockErrorStatus ?? 400,
        VARIANT_OUT_OF_STOCK_MESSAGE,
      );
    }
    return {
      productId: item.productId,
      ...(item.variantId === undefined ? {} : { variantId: item.variantId }),
      product,
      ...(variant === undefined ? {} : { variant }),
      unitPrice: product.price + (variant?.priceAdjustment ?? 0),
      quantity: item.quantity,
    };
  });
}

export interface PricingResult {
  quote: PricingQuote;
  lines: PricingLineResult[];
  resolved: ResolvedPricingLine[];
}

export async function quoteForUser(
  userId: string | undefined,
  items: OrderItemInput[],
  options: ResolveOptions = {},
): Promise<PricingResult> {
  const [resolved, promotions, user] = await Promise.all([
    resolvePricingLines(items, options),
    listActivePromotions(),
    userId === undefined
      ? Promise.resolve(null)
      : User.findById(userId).session(options.session ?? null),
  ]);

  const isStudent = user?.studentVerified === true && isStudentEmail(user.email);
  const quote = calculatePricingQuote(
    resolved.map((line) => ({
      productId: line.productId,
      ...(line.variantId === undefined ? {} : { variantId: line.variantId }),
      unitPrice: line.unitPrice,
      quantity: line.quantity,
    })),
    promotions,
    isStudent,
  );

  const lines = resolved.map((line) => {
    const discount = bestDiscountForLine(line.unitPrice, line.quantity, {
      promotions,
      isStudent,
    });
    const gross = line.unitPrice * line.quantity;
    return {
      productId: line.productId,
      ...(line.variantId === undefined ? {} : { variantId: line.variantId }),
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      subtotal: gross - (discount?.amount ?? 0),
      discount,
    };
  });

  return { quote, lines, resolved };
}
