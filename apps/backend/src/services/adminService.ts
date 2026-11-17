import { Types, type FilterQuery } from "mongoose";
import {
  ADMIN_PAGE_SIZE,
  type AdminPage,
  type AdminProduct,
  type AdminProductQuery,
} from "@tiendadcc/utils";
import { NotFoundError } from "../errors.ts";
import {
  Product,
  toPublicProduct,
  type ProductFields,
  type ProductWithSeller,
} from "../models/Product.ts";
import { Review } from "../models/Review.ts";
import { User } from "../models/User.ts";
import {
  NEWEST_FIRST,
  diacriticInsensitivePattern,
  findProducts,
  isObjectIdString,
  removeProductAndReferences,
} from "./productService.ts";

const PRODUCT_NOT_FOUND = "Producto no encontrado.";

// Promedio con 1 decimal, o null sin reseñas (spec 013, RF-2).
function roundRating(average: number): number {
  return Math.round(average * 10) / 10;
}

interface PageWindow {
  pagina: number;
  totalPaginas: number;
  skip: number;
}

// Una página mayor que la última se ajusta a la última; sin resultados,
// `pagina = 1` y `totalPaginas = 0` (convenciones de 013, como 009).
function pageWindow(total: number, requested: number): PageWindow {
  const totalPaginas = Math.ceil(total / ADMIN_PAGE_SIZE);
  const pagina = total === 0 ? 1 : Math.min(requested, totalPaginas);
  return { pagina, totalPaginas, skip: (pagina - 1) * ADMIN_PAGE_SIZE };
}

interface ReviewStats {
  reviewCount: number;
  averageRating: number | null;
}

// Conteo y promedio de reseñas de varios productos con UNA agregación
// (RNF-8), sin una consulta por fila.
async function reviewStatsByProduct(
  productIds: Types.ObjectId[],
): Promise<Map<string, ReviewStats>> {
  const stats = new Map<string, ReviewStats>();
  if (productIds.length === 0) {
    return stats;
  }
  const rows = await Review.aggregate<{
    _id: Types.ObjectId;
    count: number;
    average: number;
  }>([
    { $match: { product: { $in: productIds } } },
    {
      $group: {
        _id: "$product",
        count: { $sum: 1 },
        average: { $avg: "$rating" },
      },
    },
  ]);
  for (const row of rows) {
    stats.set(row._id.toString(), {
      reviewCount: row.count,
      averageRating: roundRating(row.average),
    });
  }
  return stats;
}

async function toAdminProducts(
  products: ProductWithSeller[],
): Promise<AdminProduct[]> {
  const stats = await reviewStatsByProduct(products.map((p) => p._id));
  return products.map((product) => ({
    ...toPublicProduct(product),
    reviewCount: stats.get(product._id.toString())?.reviewCount ?? 0,
    averageRating: stats.get(product._id.toString())?.averageRating ?? null,
  }));
}

// `q` busca en el nombre del producto o en el `username` del vendedor, sin
// distinguir mayúsculas ni tildes (RF-2). Reutiliza el patrón de 009.
async function buildAdminProductFilter(
  query: AdminProductQuery,
): Promise<FilterQuery<ProductFields>> {
  const filter: FilterQuery<ProductFields> = {};
  if (query.categoria !== undefined) {
    filter.category = query.categoria;
  }
  if (query.destacados === true) {
    filter.featured = true;
  }
  if (query.q !== undefined) {
    const pattern = { $regex: diacriticInsensitivePattern(query.q), $options: "i" };
    const sellers = await User.find({ username: pattern }, { _id: 1 }).lean();
    filter.$or = [
      { name: pattern },
      { seller: { $in: sellers.map((seller) => seller._id) } },
    ];
  }
  return filter;
}

export async function listAdminProducts(
  query: AdminProductQuery,
): Promise<AdminPage<AdminProduct>> {
  const filter = await buildAdminProductFilter(query);
  const total = await Product.countDocuments(filter);
  const { pagina, totalPaginas, skip } = pageWindow(total, query.pagina);
  const products = await findProducts(filter, { ...NEWEST_FIRST }, {
    skip,
    limit: ADMIN_PAGE_SIZE,
  });
  return {
    items: await toAdminProducts(products),
    total,
    pagina,
    porPagina: ADMIN_PAGE_SIZE,
    totalPaginas,
  };
}

async function findAdminProduct(id: string): Promise<AdminProduct> {
  const [product] = await findProducts({ _id: id });
  if (!product) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  const [item] = await toAdminProducts([product]);
  if (!item) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  return item;
}

// Marca o quita un destacado (RF-3). `updatedAt` se actualiza solo (timestamps
// de Mongoose), así que el `?v=` de la imagen cambia como en 008.
export async function setProductFeatured(
  id: string,
  featured: boolean,
): Promise<AdminProduct> {
  if (!isObjectIdString(id)) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  const updated = await Product.findByIdAndUpdate(
    id,
    { $set: { featured } },
    { new: true, projection: { _id: 1 } },
  ).lean();
  if (!updated) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  return findAdminProduct(id);
}

// Elimina cualquier producto, de cualquier vendedor (RF-4), con la misma
// limpieza que el borrado del dueño (RF-5).
export async function adminDeleteProduct(id: string): Promise<void> {
  if (!isObjectIdString(id)) {
    throw new NotFoundError(PRODUCT_NOT_FOUND);
  }
  await removeProductAndReferences(id);
}
