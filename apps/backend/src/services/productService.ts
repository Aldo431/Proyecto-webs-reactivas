import type { AnyObject, FilterQuery } from "mongoose";
import {
  CATALOG_PAGE_SIZE,
  parseDataUrl,
  type CreateProductInput,
  type Product as PublicProduct,
  type ProductListQuery,
  type UpdateProductInput,
} from "@tiendadcc/utils";
import { ForbiddenError, NotFoundError } from "../errors.ts";
import {
  Product,
  toPublicProduct,
  type ProductFields,
  type ProductWithSeller,
} from "../models/Product.ts";
import { User } from "../models/User.ts";

const PRODUCT_NOT_FOUND = "Producto no encontrado.";
const NOT_OWNER_MESSAGE =
  "No puedes modificar una publicación de otro usuario.";

// Los ids de MongoDB son 24 caracteres hexadecimales. `isValidObjectId` de
// Mongoose también acepta cualquier texto de 12 caracteres, que aquí debe
// tratarse como "no existe" (spec 008, D7).
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export function isObjectIdString(value: string): boolean {
  return OBJECT_ID_PATTERN.test(value);
}

// Proyección de lectura: trae el contenido del data URL solo como el marcador
// "data:" para no mover megabytes desde MongoDB (RF-5, D2). Las rutas y URL
// se devuelven completas.
export const READ_PROJECTION: AnyObject = {
  name: 1,
  description: 1,
  category: 1,
  price: 1,
  featured: 1,
  seller: 1,
  createdAt: 1,
  updatedAt: 1,
  image: {
    $cond: [
      { $eq: [{ $substrCP: ["$image", 0, 5] }, "data:"] },
      "data:",
      "$image",
    ],
  },
};

const NEWEST_FIRST = { createdAt: -1, _id: -1 } as const;

// Collation español que ignora mayúsculas y tildes en comparaciones y
// ordenamientos de texto (spec 009, RF-1, RF-2).
const SPANISH_COLLATION = { locale: "es", strength: 2 } as const;

type SortSpec = { [field: string]: 1 | -1 };

// Órdenes del catálogo (spec 009, RF-2), todos con desempate total para que
// las páginas sean estables.
const SORT_MAP: Record<ProductListQuery["orden"], SortSpec> = {
  recientes: { ...NEWEST_FIRST },
  "precio-menor": { price: 1, createdAt: -1, _id: -1 },
  "precio-mayor": { price: -1, createdAt: -1, _id: -1 },
  nombre: { name: 1, _id: 1 },
};

// Escapa un texto para usarlo como literal dentro de una regex (el `q` de
// búsqueda nunca se interpreta como patrón).
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DIACRITIC_GROUPS: Record<string, string> = {
  a: "aáàäâ",
  e: "eéèëê",
  i: "iíìïî",
  o: "oóòöô",
  u: "uúùüû",
};

// Convierte un texto en un patrón que ignora las tildes: cada vocal acepta
// sus variantes con diacríticos. Con `$options: "i"` también ignora
// mayúsculas (la `ñ` no se expande: es una letra distinta en español).
export function diacriticInsensitivePattern(value: string): string {
  return [...value]
    .map((char) => {
      const group = DIACRITIC_GROUPS[char.toLowerCase()];
      if (group === undefined) {
        return escapeRegExp(char);
      }
      return `[${group}]`;
    })
    .join("");
}

type ProductRow = Omit<ProductWithSeller, "seller"> & {
  seller: ProductWithSeller["seller"] | null;
};

async function findProducts(
  filter: FilterQuery<ProductFields>,
  sort: SortSpec = { ...NEWEST_FIRST },
  page?: { skip: number; limit: number },
): Promise<ProductWithSeller[]> {
  let query = Product.find(filter, READ_PROJECTION)
    .sort(sort)
    .collation(SPANISH_COLLATION);
  if (page !== undefined) {
    query = query.skip(page.skip).limit(page.limit);
  }
  const products = await query
    .populate("seller", "username displayName")
    .lean<ProductRow[]>();
  // Un vendedor inexistente no puede serializarse sin datos inventados
  // (no hay eliminación de cuentas, pero el contrato lo exige).
  return products.filter(
    (product): product is ProductWithSeller => product.seller !== null,
  );
}

// Filtro MongoDB con los criterios combinables (categoría, destacados,
// texto, rango de precios). Sin `ids`: esa parte vive en `listProducts`.
function buildProductFilter(query: ProductListQuery): FilterQuery<ProductFields> {
  const filter: FilterQuery<ProductFields> = {};
  if (query.categoria !== undefined) {
    filter.category = query.categoria;
  }
  if (query.featured !== undefined) {
    filter.featured = query.featured;
  }
  if (query.q !== undefined) {
    filter.name = {
      $regex: diacriticInsensitivePattern(query.q),
      $options: "i",
    };
  }
  if (query.min !== undefined || query.max !== undefined) {
    filter.price = {
      ...(query.min !== undefined ? { $gte: query.min } : {}),
      ...(query.max !== undefined ? { $lte: query.max } : {}),
    };
  }
  return filter;
}

export interface ProductPageResult {
  products: PublicProduct[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

// Listado paginado del catálogo (spec 009, RF-4): cuenta las coincidencias,
// ajusta la página excedida a la última y devuelve una sola página con los
// totales para numerar.
export async function listProductPage(
  query: ProductListQuery,
): Promise<ProductPageResult> {
  const filter = buildProductFilter(query);
  const total = await Product.countDocuments(filter);
  const totalPaginas = Math.ceil(total / CATALOG_PAGE_SIZE);
  const pagina = total === 0 ? 1 : Math.min(query.pagina, totalPaginas);
  const products = await findProducts(filter, SORT_MAP[query.orden], {
    skip: (pagina - 1) * CATALOG_PAGE_SIZE,
    limit: CATALOG_PAGE_SIZE,
  });
  return {
    products: products.map(toPublicProduct),
    total,
    pagina,
    porPagina: CATALOG_PAGE_SIZE,
    totalPaginas,
  };
}

export async function listProducts(
  query: ProductListQuery,
): Promise<PublicProduct[]> {
  const filter = buildProductFilter(query);

  const requestedIds = query.ids?.filter(isObjectIdString);
  if (requestedIds !== undefined) {
    if (requestedIds.length === 0) {
      return [];
    }
    filter._id = { $in: requestedIds };
  }

  const products = await findProducts(filter, SORT_MAP[query.orden]);
  if (requestedIds === undefined) {
    return products.map(toPublicProduct);
  }

  // `?ids=` conserva el orden pedido (ids duplicados ya vienen deduplicados).
  const position = new Map(
    requestedIds.map((id, index) => [id.toLowerCase(), index]),
  );
  return products
    .sort(
      (first, second) =>
        (position.get(first._id.toString()) ?? 0) -
        (position.get(second._id.toString()) ?? 0),
    )
    .map(toPublicProduct);
}

export async function listProductsBySeller(
  userId: string,
): Promise<PublicProduct[]> {
  const products = await findProducts({ seller: userId });
  return products.map(toPublicProduct);
}

export async function findPublicProduct(id: string): Promise<PublicProduct> {
  if (!isObjectIdString(id)) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  const [product] = await findProducts({ _id: id });
  if (!product) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  return toPublicProduct(product);
}

export type ProductImage =
  | { kind: "binary"; mime: string; data: Buffer }
  | { kind: "redirect"; location: string };

// Imagen completa de un producto (RF-6): binario si se subió como data URL,
// redirección si es una ruta o URL del seed.
export async function getProductImage(id: string): Promise<ProductImage> {
  if (!isObjectIdString(id)) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  const product = await Product.findById(id, { image: 1 }).lean();
  if (!product) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }

  const parsed = parseDataUrl(product.image);
  if (parsed === null) {
    if (product.image.startsWith("data:")) {
      throw new NotFoundError(PRODUCT_NOT_FOUND);
    }
    return { kind: "redirect", location: product.image };
  }
  return {
    kind: "binary",
    mime: parsed.mime,
    data: Buffer.from(parsed.base64, "base64"),
  };
}

// Verifica que el producto exista y sea del usuario (404 antes que 403, RF-10).
// El controlador la llama antes de validar el cuerpo para que un no dueño
// reciba 403 y no los errores de validación.
export async function assertProductOwner(
  userId: string,
  id: string,
): Promise<void> {
  if (!isObjectIdString(id)) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  const product = await Product.findById(id, { seller: 1 }).lean();
  if (!product) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  if (product.seller.toString() !== userId) {
    throw new ForbiddenError(NOT_OWNER_MESSAGE);
  }
}

// `seller` sale de la sesión y `featured` siempre empieza en false (RF-9).
export async function createProduct(
  userId: string,
  input: CreateProductInput,
): Promise<PublicProduct> {
  const product = await Product.create({
    name: input.name,
    description: input.description,
    category: input.category,
    price: input.price,
    image: input.image,
    featured: false,
    seller: userId,
  });
  return findPublicProduct(product._id.toString());
}

// Actualiza solo los campos enviados (RF-10). Quien llama ya verificó la
// propiedad con `assertProductOwner`; `seller` y `featured` no están en
// `UpdateProductInput` y no se pueden tocar.
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<PublicProduct> {
  const changes = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
  const updated = await Product.findByIdAndUpdate(
    id,
    { $set: changes },
    { new: true, runValidators: true, projection: { _id: 1 } },
  ).lean();
  if (!updated) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  return findPublicProduct(id);
}

// Borra el producto y quita su id de favoritos, historial y carrito de todas
// las cuentas (RF-11). Si la limpieza falla el borrado se mantiene: el
// frontend ya descarta referencias huérfanas (RF-15).
export async function deleteProduct(
  userId: string,
  id: string,
): Promise<void> {
  await assertProductOwner(userId, id);
  const result = await Product.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  try {
    await User.updateMany(
      {},
      {
        $pull: {
          favorites: id,
          history: { productId: id },
          cart: { productId: id },
        },
      },
    );
  } catch (error) {
    console.error("No se pudieron limpiar las referencias al producto.", error);
  }
}
