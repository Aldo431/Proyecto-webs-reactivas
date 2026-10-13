import { z } from "zod";

// Categorías del catálogo (spec 008, RF-1): única fuente de verdad para el
// modelo, la API, los filtros y los formularios.
export const PRODUCT_CATEGORIES = ["Tazas", "Poleras", "Stickers"] as const;

export const productCategorySchema = z.enum(PRODUCT_CATEGORIES, {
  error: "Selecciona una categoría válida.",
});

// Límites de la imagen subida (RF-3), del precio (RF-2) y de la consulta por
// ids (RF-5).
export const MAX_IMAGE_BYTES = 1_048_576;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_PRODUCT_PRICE = 10_000_000;
export const MAX_IDS_PER_QUERY = 100;

const IMAGE_REQUIRED_MESSAGE = "La imagen es obligatoria.";
const IMAGE_TYPE_MESSAGE =
  "Formato de imagen no permitido. Usa JPG, PNG o WebP.";
const IMAGE_INVALID_MESSAGE = "El archivo no es una imagen válida.";
const IMAGE_SIZE_MESSAGE = "La imagen no puede superar 1 MB.";

export interface ParsedDataUrl {
  mime: string;
  base64: string;
}

// Separa `data:<mime>;base64,<datos>`; devuelve null si el valor no tiene esa
// forma. No valida el tipo ni el contenido.
export function parseDataUrl(value: string): ParsedDataUrl | null {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(value);
  if (match === null) {
    return null;
  }
  const [, mime, base64] = match;
  if (mime === undefined || base64 === undefined) {
    return null;
  }
  return { mime, base64 };
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function isStandardBase64(base64: string): boolean {
  return base64.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(base64);
}

// Bytes que ocupa el contenido ya decodificado, sin decodificarlo (3 bytes
// por cada 4 caracteres, menos el relleno `=`).
export function base64DecodedBytes(base64: string): number {
  let padding = 0;
  if (base64.endsWith("==")) {
    padding = 2;
  } else if (base64.endsWith("=")) {
    padding = 1;
  }
  return Math.max(0, (base64.length / 4) * 3 - padding);
}

// Decodifica solo los primeros `maxBytes` bytes. `atob` no existe en la
// configuración de tipos de este paquete (sin DOM ni Node), y para comprobar
// una firma basta un prefijo.
function decodeBase64Prefix(base64: string, maxBytes: number): number[] {
  const bytes: number[] = [];
  const prefix = base64.slice(0, Math.ceil((maxBytes * 4) / 3) + 4);
  let buffer = 0;
  let bits = 0;
  for (const char of prefix) {
    if (bytes.length >= maxBytes || char === "=") {
      break;
    }
    const value = BASE64_ALPHABET.indexOf(char);
    if (value < 0) {
      break;
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }
  return bytes;
}

function startsWithAscii(bytes: number[], offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) {
      return false;
    }
  }
  return true;
}

// Comprueba que los primeros bytes correspondan al tipo declarado: JPEG
// `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`.
export function hasImageSignature(mime: string, base64: string): boolean {
  const bytes = decodeBase64Prefix(base64, 12);
  switch (mime) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    case "image/webp":
      return startsWithAscii(bytes, 0, "RIFF") && startsWithAscii(bytes, 8, "WEBP");
    default:
      return false;
  }
}

function isAllowedImageType(mime: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
}

// Devuelve el mensaje en español del primer problema de una imagen subida, o
// null si es válida. Orden: tipo → base64 → tamaño → firma (la presencia se
// valida antes, en el esquema).
function uploadImageError(value: string): string | null {
  const parsed = parseDataUrl(value);
  if (parsed === null || !isAllowedImageType(parsed.mime)) {
    return IMAGE_TYPE_MESSAGE;
  }
  if (!isStandardBase64(parsed.base64)) {
    return IMAGE_INVALID_MESSAGE;
  }
  if (base64DecodedBytes(parsed.base64) > MAX_IMAGE_BYTES) {
    return IMAGE_SIZE_MESSAGE;
  }
  if (!hasImageSignature(parsed.mime, parsed.base64)) {
    return IMAGE_INVALID_MESSAGE;
  }
  return null;
}

// Imagen que sube un usuario (creación y edición): solo data URL.
export const uploadImageSchema = z
  .string({ error: IMAGE_REQUIRED_MESSAGE })
  .min(1, IMAGE_REQUIRED_MESSAGE)
  .superRefine((value, context) => {
    const message = uploadImageError(value);
    if (message !== null) {
      context.addIssue({ code: "custom", message });
    }
  });

// Imagen de un producto ya publicado: data URL válido, ruta absoluta del sitio
// (`/images/x.png`, `/api/products/<id>/image?v=…`) o URL http(s).
export const productImageSchema = z
  .string({ error: IMAGE_REQUIRED_MESSAGE })
  .min(1, IMAGE_REQUIRED_MESSAGE)
  .superRefine((value, context) => {
    if (value.startsWith("data:")) {
      const message = uploadImageError(value);
      if (message !== null) {
        context.addIssue({ code: "custom", message });
      }
      return;
    }
    const isSitePath = /^\/(?!\/)\S*$/.test(value);
    const isHttpUrl = /^https?:\/\/\S+$/i.test(value);
    if (!isSitePath && !isHttpUrl) {
      context.addIssue({ code: "custom", message: "Imagen inválida." });
    }
  });

const nameField = z
  .string({ error: "El nombre es obligatorio." })
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(80, "El nombre no puede superar los 80 caracteres.");

const descriptionField = z
  .string({ error: "La descripción es obligatoria." })
  .trim()
  .min(1, "La descripción es obligatoria.")
  .max(1000, "La descripción no puede superar los 1000 caracteres.");

const priceField = z
  .number({ error: "Ingresa un precio válido." })
  .int("El precio debe ser un número entero.")
  .positive("El precio debe ser mayor a cero.")
  .max(
    MAX_PRODUCT_PRICE,
    "El precio no puede superar los $10.000.000.",
  );

export const productSellerSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
});

// Contrato público de un producto (sin correo del vendedor).
export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: productCategorySchema,
  price: z.number().int().positive(),
  image: productImageSchema,
  featured: z.boolean(),
  seller: productSellerSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const productListSchema = z.array(productSchema);

// `featured` y `seller` no existen en la entrada: z.object descarta claves
// desconocidas, de modo que el cuerpo nunca puede asignarlas.
export const createProductInputSchema = z.object({
  name: nameField,
  description: descriptionField,
  category: productCategorySchema,
  price: priceField,
  image: uploadImageSchema,
});

export const updateProductInputSchema = createProductInputSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: "No hay cambios para guardar." },
  );

// Parámetros de `GET /api/products` (RF-5).
export const productListQuerySchema = z.object({
  categoria: productCategorySchema.optional(),
  featured: z
    .enum(["true", "false"], {
      error: "El filtro de destacados debe ser true o false.",
    })
    .transform((value) => value === "true")
    .optional(),
  ids: z
    .string({ error: "La lista de identificadores es inválida." })
    .transform((value) => [
      ...new Set(
        value
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    ])
    .refine((ids) => ids.length <= MAX_IDS_PER_QUERY, {
      message: `Puedes consultar como máximo ${MAX_IDS_PER_QUERY} productos a la vez.`,
    })
    .optional(),
});

export type ProductCategory = z.infer<typeof productCategorySchema>;
export type ProductSeller = z.infer<typeof productSellerSchema>;
export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
