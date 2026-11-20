import { Schema, model, type Types } from "mongoose";
import {
  MAX_PRODUCT_PRICE,
  MAX_VARIANT_STOCK,
  BASE_VARIANT,
  PRODUCT_CATEGORIES,
  type ProductVariant as PublicProductVariant,
  type Product as PublicProduct,
  type ProductCategory,
} from "@tiendadcc/utils";

export interface ProductFields {
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  /** Data URL subido por un usuario, o ruta/URL (productos del seed). */
  image: string;
  featured: boolean;
  variants: ProductVariantFields[];
  seller: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantFields {
  _id: Types.ObjectId;
  name: string;
  stock: number;
  priceAdjustment: number;
}

// Los validadores repiten los límites de los esquemas Zod de `@tiendadcc/utils`
// como respaldo: la validación de entrada vive en Zod (spec 008, RF-2).
const productSchema = new Schema<ProductFields>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio."],
      trim: true,
      minlength: [1, "El nombre es obligatorio."],
      maxlength: [80, "El nombre no puede superar los 80 caracteres."],
    },
    description: {
      type: String,
      required: [true, "La descripción es obligatoria."],
      trim: true,
      minlength: [1, "La descripción es obligatoria."],
      maxlength: [1000, "La descripción no puede superar los 1000 caracteres."],
    },
    category: {
      type: String,
      required: [true, "La categoría es obligatoria."],
      enum: { values: [...PRODUCT_CATEGORIES], message: "Categoría inválida." },
    },
    price: {
      type: Number,
      required: [true, "El precio es obligatorio."],
      validate: {
        validator: (value: number) =>
          Number.isInteger(value) && value > 0 && value <= MAX_PRODUCT_PRICE,
        message: "El precio debe ser un entero mayor a cero.",
      },
    },
    image: {
      type: String,
      required: [true, "La imagen es obligatoria."],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    variants: {
      type: [
        {
          name: {
            type: String,
            required: [true, "El nombre de la variante es obligatorio."],
            trim: true,
            minlength: [1, "El nombre de la variante es obligatorio."],
            maxlength: [
              80,
              "El nombre de la variante no puede superar los 80 caracteres.",
            ],
          },
          stock: {
            type: Number,
            required: [true, "El stock de la variante es obligatorio."],
            min: [0, "El stock no puede ser negativo."],
            max: [MAX_VARIANT_STOCK, "El stock no puede superar 1000 unidades."],
            validate: {
              validator: (value: number) =>
                Number.isInteger(value) && value >= 0 && value <= MAX_VARIANT_STOCK,
              message: "El stock debe ser un entero entre 0 y 1000.",
            },
          },
          priceAdjustment: {
            type: Number,
            required: true,
            default: 0,
            min: [0, "El recargo no puede ser negativo."],
            validate: {
              validator: (value: number) =>
                Number.isInteger(value) && value >= 0 && value <= MAX_PRODUCT_PRICE,
              message: "El recargo debe ser un entero válido.",
            },
          },
        },
      ],
      default: [],
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

productSchema.index({ createdAt: -1, _id: -1 });
productSchema.index({ price: 1, createdAt: -1, _id: -1 });

export const Product = model<ProductFields>("Product", productSchema);

/** Vendedor tal como llega de `populate("seller", "username displayName")`. */
export interface PopulatedSeller {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
}

/** Producto leído con `lean()` y el vendedor poblado. */
export interface ProductWithSeller extends Omit<ProductFields, "seller"> {
  _id: Types.ObjectId;
  seller: PopulatedSeller;
}

const DATA_URL_PREFIX = "data:";

export function productImagePath(id: string, updatedAt: Date): string {
  return `/api/products/${id}/image?v=${updatedAt.getTime()}`;
}

// Un data URL nunca sale en la respuesta (RF-5): se reemplaza por la ruta
// versionada que sirve la imagen como binario. Las rutas/URL del seed pasan
// tal cual. En los listados la proyección ya recorta el data URL a "data:".
export function publicImageUrl(
  id: string,
  image: string,
  updatedAt: Date,
): string {
  return image.startsWith(DATA_URL_PREFIX)
    ? productImagePath(id, updatedAt)
    : image;
}

// Contrato público (RF-1): el vendedor solo expone id, username y displayName.
export function toPublicProduct(product: ProductWithSeller): PublicProduct {
  const id = product._id.toString();
  const variants = product.variants?.length
    ? product.variants.map(
        (variant): PublicProductVariant => ({
          id: variant._id.toString(),
          name: variant.name,
          stock: variant.stock,
          priceAdjustment: variant.priceAdjustment ?? 0,
        }),
      )
    : [BASE_VARIANT];
  return {
    id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    image: publicImageUrl(id, product.image, product.updatedAt),
    featured: product.featured,
    variants,
    seller: {
      id: product.seller._id.toString(),
      username: product.seller.username,
      displayName: product.seller.displayName,
    },
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
