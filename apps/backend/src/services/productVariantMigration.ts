import { BASE_VARIANT } from "@tiendadcc/utils";
import { Product } from "../models/Product.ts";

function variantNamesForCategory(category: string): string[] {
  switch (category) {
    case "Poleras":
      return ["Talla S", "Talla M", "Talla L", "Talla XL"];
    case "Tazas":
      return ["330 ml", "450 ml"];
    case "Stickers":
      return ["Individual", "Pack x3"];
    case "Pins":
      return ["Individual", "Pack x2"];
    default:
      return ["Base"];
  }
}

function adjustmentForVariant(category: string, name: string): number {
  if (category === "Poleras") {
    return { "Talla S": 0, "Talla M": 500, "Talla L": 1000, "Talla XL": 1500 }[
      name
    ] ?? 0;
  }
  if (category === "Tazas") {
    return { "330 ml": 0, "450 ml": 1000 }[name] ?? 0;
  }
  if (category === "Stickers") {
    return { Individual: 0, "Pack x3": 2500 }[name] ?? 0;
  }
  if (category === "Pins") {
    return { Individual: 0, "Pack x2": 1500 }[name] ?? 0;
  }
  return 0;
}

/**
 * Completa productos legacy sin variantes. Guardado documento a documento para
 * que Mongoose genere el `_id` de la variante embebida.
 */
export async function migrateProductVariants(): Promise<number> {
  const products = await Product.find({});
  let migrated = 0;
  for (const product of products) {
    const variants = product.variants ?? [];
    if (
      variants.length > 0 &&
      !(variants.length === 1 && variants[0]?.name === "Base")
    ) {
      if (
        variants.some(
          (variant) =>
            (variant.priceAdjustment ?? 0) !==
            adjustmentForVariant(product.category, variant.name),
        )
      ) {
        product.variants = variants.map((variant) => ({
          name: variant.name,
          stock: variant.stock,
          priceAdjustment: adjustmentForVariant(product.category, variant.name),
        })) as never;
        await product.save();
        migrated += 1;
      }
      continue;
    }
    product.variants = variantNamesForCategory(product.category).map((name) => ({
      name,
      stock: BASE_VARIANT.stock,
      priceAdjustment: adjustmentForVariant(product.category, name),
    })) as never;
    await product.save();
    migrated += 1;
  }
  return migrated;
}
