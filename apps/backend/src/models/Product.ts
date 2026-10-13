import { Schema, model, type Types } from "mongoose";
import {
  MAX_PRODUCT_PRICE,
  PRODUCT_CATEGORIES,
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
  seller: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
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
  return {
    id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    image: publicImageUrl(id, product.image, product.updatedAt),
    featured: product.featured,
    seller: {
      id: product.seller._id.toString(),
      username: product.seller.username,
      displayName: product.seller.displayName,
    },
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
