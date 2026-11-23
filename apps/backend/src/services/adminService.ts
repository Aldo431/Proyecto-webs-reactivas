import { Types, type FilterQuery } from "mongoose";
import {
  ADMIN_PAGE_SIZE,
  PRODUCT_CATEGORIES,
  type AdminActivity,
  type AdminOverview,
  type AdminPage,
  type AdminProduct,
  type AdminProductQuery,
  type AdminReview,
  type AdminReviewQuery,
  type AdminUser,
  type AdminUserQuery,
  type UserRole,
} from "@tiendadcc/utils";
import { ForbiddenError, NotFoundError } from "../errors.ts";
import {
  Product,
  toPublicProduct,
  type ProductFields,
  type ProductWithSeller,
} from "../models/Product.ts";
import { Review } from "../models/Review.ts";
import { User, type UserFields } from "../models/User.ts";
import {
  NEWEST_FIRST,
  diacriticInsensitivePattern,
  findProducts,
  isObjectIdString,
  removeProductAndReferences,
} from "./productService.ts";

const PRODUCT_NOT_FOUND = "Producto no encontrado.";
const USER_NOT_FOUND = "Usuario no encontrado.";
const REVIEW_NOT_FOUND = "Reseña no encontrada.";
const OWN_ROLE_MESSAGE = "No puedes cambiar tu propio rol.";

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

// --- Usuarios (RF-6, RF-7) ---------------------------------------------------

// Proyección explícita: nunca se leen `passwordHash`, `resetToken`,
// `sessionVersion`, favoritos, historial ni carrito (RF-6). `name` es el
// campo legado previo a 007.
const USER_PROJECTION = {
  username: 1,
  displayName: 1,
  name: 1,
  email: 1,
  role: 1,
  emailVerified: 1,
  createdAt: 1,
} as const;

interface UserRow {
  _id: Types.ObjectId;
  username?: string;
  displayName?: string;
  name?: string;
  email: string;
  role?: UserRole;
  emailVerified?: boolean;
  createdAt: Date;
}

async function countByOwner(
  rows: Promise<Array<{ _id: Types.ObjectId; count: number }>>,
): Promise<Map<string, number>> {
  return new Map((await rows).map((row) => [row._id.toString(), row.count]));
}

// Publicaciones y reseñas por usuario con UNA agregación cada una sobre los
// ids de la página (RNF-8).
async function toAdminUsers(rows: UserRow[]): Promise<AdminUser[]> {
  const ids = rows.map((row) => row._id);
  const [products, reviews] =
    ids.length === 0
      ? [new Map<string, number>(), new Map<string, number>()]
      : await Promise.all([
          countByOwner(
            Product.aggregate([
              { $match: { seller: { $in: ids } } },
              { $group: { _id: "$seller", count: { $sum: 1 } } },
            ]),
          ),
          countByOwner(
            Review.aggregate([
              { $match: { author: { $in: ids } } },
              { $group: { _id: "$author", count: { $sum: 1 } } },
            ]),
          ),
        ]);
  return rows.map((row) => {
    const username = row.username ?? row.name ?? "";
    return {
      id: row._id.toString(),
      username,
      displayName: row.displayName ?? row.name ?? username,
      email: row.email,
      // Cuentas anteriores a 012 no tienen `role` (012 RF-1).
      role: row.role ?? "user",
      emailVerified: row.emailVerified ?? false,
      productCount: products.get(row._id.toString()) ?? 0,
      reviewCount: reviews.get(row._id.toString()) ?? 0,
      createdAt: row.createdAt.toISOString(),
    };
  });
}

function findUserRows(
  filter: FilterQuery<UserFields>,
  page?: { skip: number; limit: number },
): Promise<UserRow[]> {
  let query = User.find(filter, USER_PROJECTION).sort({ ...NEWEST_FIRST });
  if (page !== undefined) {
    query = query.skip(page.skip).limit(page.limit);
  }
  return query.lean<UserRow[]>();
}

function buildAdminUserFilter(query: AdminUserQuery): FilterQuery<UserFields> {
  const filter: FilterQuery<UserFields> = {};
  if (query.rol === "admin") {
    filter.role = "admin";
  } else if (query.rol === "user") {
    // `$ne` incluye las cuentas legadas sin `role`.
    filter.role = { $ne: "admin" };
  }
  if (query.q !== undefined) {
    const pattern = { $regex: diacriticInsensitivePattern(query.q), $options: "i" };
    filter.$or = [{ displayName: pattern }, { username: pattern }, { email: pattern }];
  }
  return filter;
}

export async function listAdminUsers(
  query: AdminUserQuery,
): Promise<AdminPage<AdminUser>> {
  const filter = buildAdminUserFilter(query);
  const total = await User.countDocuments(filter);
  const { pagina, totalPaginas, skip } = pageWindow(total, query.pagina);
  const rows = await findUserRows(filter, { skip, limit: ADMIN_PAGE_SIZE });
  return {
    items: await toAdminUsers(rows),
    total,
    pagina,
    porPagina: ADMIN_PAGE_SIZE,
    totalPaginas,
  };
}

export async function assertUserExists(id: string): Promise<void> {
  if (!isObjectIdString(id) || (await User.exists({ _id: id })) === null) {
    throw new NotFoundError(USER_NOT_FOUND);
  }
}

// Cambia el rol de otra cuenta (RF-7). 404 -> 403: nadie cambia su propio
// rol, así siempre queda al menos un administrador (D4). El cambio aplica en
// la siguiente solicitud del afectado porque el rol se lee de MongoDB.
export async function setUserRole(
  actingUserId: string,
  targetId: string,
  role: UserRole,
): Promise<AdminUser> {
  if (!isObjectIdString(targetId)) {
    throw new NotFoundError(USER_NOT_FOUND);
  }
  if (targetId.toLowerCase() === actingUserId.toLowerCase()) {
    throw new ForbiddenError(OWN_ROLE_MESSAGE);
  }
  const updated = await User.findByIdAndUpdate(
    targetId,
    { $set: { role } },
    { new: true, projection: USER_PROJECTION },
  ).lean<UserRow | null>();
  if (!updated) {
    throw new NotFoundError(USER_NOT_FOUND);
  }
  const [item] = await toAdminUsers([updated]);
  if (!item) {
    throw new NotFoundError(USER_NOT_FOUND);
  }
  return item;
}

// --- Reseñas (RF-8, RF-9) ----------------------------------------------------

const LOW_RATING_MAX = 2;
const HIGH_RATING_MIN = 4;

type ReviewSort = Record<string, 1 | -1>;

const REVIEW_SORTS: Record<AdminReviewQuery["orden"], ReviewSort> = {
  recientes: { createdAt: -1, _id: -1 },
  menor: { rating: 1, createdAt: -1, _id: -1 },
};

interface ReviewAggregateRow {
  _id: Types.ObjectId;
  product: { _id: Types.ObjectId; name: string };
  author: { _id: Types.ObjectId; username?: string; displayName?: string; name?: string };
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

function toAdminReview(row: ReviewAggregateRow): AdminReview {
  const username = row.author.username ?? row.author.name ?? "";
  return {
    id: row._id.toString(),
    productId: row.product._id.toString(),
    author: {
      id: row.author._id.toString(),
      username,
      displayName: row.author.displayName ?? row.author.name ?? username,
    },
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    product: { id: row.product._id.toString(), name: row.product.name },
  };
}

// Reseñas con su producto y su autor en UNA agregación. Los `$unwind` sin
// `preserveNullAndEmptyArrays` descartan las reseñas huérfanas (producto o
// autor inexistente), igual que el resto del panel.
export async function findAdminReviews(
  match: Record<string, unknown>,
  sort: ReviewSort,
  window: { skip: number; limit: number },
): Promise<{ rows: AdminReview[]; total: number }> {
  const [result] = await Review.aggregate<{
    items: ReviewAggregateRow[];
    total: Array<{ count: number }>;
  }>([
    { $match: match },
    {
      $lookup: {
        from: Product.collection.name,
        let: { productId: "$product" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$productId"] } } },
          { $project: { name: 1 } },
        ],
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: User.collection.name,
        let: { authorId: "$author" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$authorId"] } } },
          { $project: { username: 1, displayName: 1, name: 1 } },
        ],
        as: "author",
      },
    },
    { $unwind: "$author" },
    { $sort: sort },
    {
      $facet: {
        items: [{ $skip: window.skip }, { $limit: window.limit }],
        total: [{ $count: "count" }],
      },
    },
  ]);
  return {
    rows: (result?.items ?? []).map(toAdminReview),
    total: result?.total[0]?.count ?? 0,
  };
}

function reviewMatch(query: AdminReviewQuery): Record<string, unknown> {
  if (query.calificacion === "bajas") {
    return { rating: { $lte: LOW_RATING_MAX } };
  }
  if (query.calificacion === "altas") {
    return { rating: { $gte: HIGH_RATING_MIN } };
  }
  return {};
}

export async function listAdminReviews(
  query: AdminReviewQuery,
): Promise<AdminPage<AdminReview>> {
  const match = reviewMatch(query);
  const sort = REVIEW_SORTS[query.orden];
  let result = await findAdminReviews(match, sort, {
    skip: (query.pagina - 1) * ADMIN_PAGE_SIZE,
    limit: ADMIN_PAGE_SIZE,
  });
  const { pagina, totalPaginas, skip } = pageWindow(result.total, query.pagina);
  if (result.total > 0 && pagina !== query.pagina) {
    // Página excedida: se repite una vez con la última.
    result = await findAdminReviews(match, sort, {
      skip,
      limit: ADMIN_PAGE_SIZE,
    });
  }
  return {
    items: result.rows,
    total: result.total,
    pagina,
    porPagina: ADMIN_PAGE_SIZE,
    totalPaginas,
  };
}

export async function adminDeleteReview(id: string): Promise<void> {
  if (!isObjectIdString(id)) {
    throw new NotFoundError(REVIEW_NOT_FOUND);
  }
  const result = await Review.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new NotFoundError(REVIEW_NOT_FOUND);
  }
}

// --- Resumen (RF-1) ----------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const OVERVIEW_DAYS = 7;
const ACTIVITY_LIMIT = 8;
const LATEST_PRODUCTS_LIMIT = 4;
const LOW_REVIEWS_LIMIT = 3;

interface ReviewTotals {
  total: number;
  average: number;
  newLast7Days: number;
  lowLast7Days: number;
}

// Totales de reseñas en una agregación; el `$lookup` + `$match` excluye las
// reseñas de productos que ya no existen (casos límite de 013).
async function reviewTotals(since: Date): Promise<ReviewTotals | undefined> {
  const [totals] = await Review.aggregate<ReviewTotals>([
    {
      $lookup: {
        from: Product.collection.name,
        let: { productId: "$product" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$productId"] } } },
          { $project: { _id: 1 } },
        ],
        as: "productDoc",
      },
    },
    { $match: { "productDoc.0": { $exists: true } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        average: { $avg: "$rating" },
        newLast7Days: {
          $sum: { $cond: [{ $gte: ["$createdAt", since] }, 1, 0] },
        },
        lowLast7Days: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", since] },
                  { $lte: ["$rating", LOW_RATING_MAX] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  return totals;
}

async function productsByCategory(): Promise<
  AdminOverview["products"]["byCategory"]
> {
  const rows = await Product.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  // Siempre las cuatro categorías, en el orden de PRODUCT_CATEGORIES.
  return PRODUCT_CATEGORIES.map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
}

async function recentActivity(
  products: ProductWithSeller[],
): Promise<AdminActivity[]> {
  const [users, reviews] = await Promise.all([
    User.find({}, { username: 1, name: 1, createdAt: 1 })
      .sort({ ...NEWEST_FIRST })
      .limit(ACTIVITY_LIMIT)
      .lean<
        Array<{ username?: string; name?: string; createdAt: Date }>
      >(),
    findAdminReviews({}, REVIEW_SORTS.recientes, {
      skip: 0,
      limit: ACTIVITY_LIMIT,
    }),
  ]);
  const events: AdminActivity[] = [
    ...users.map(
      (user): AdminActivity => ({
        type: "user_registered",
        at: user.createdAt.toISOString(),
        user: { username: user.username ?? user.name ?? "" },
      }),
    ),
    ...products.map(
      (product): AdminActivity => ({
        type: "product_published",
        at: product.createdAt.toISOString(),
        user: { username: product.seller.username },
        product: { id: product._id.toString(), name: product.name },
      }),
    ),
    ...reviews.rows.map(
      (review): AdminActivity => ({
        type: "review_created",
        at: review.createdAt,
        user: { username: review.author.username },
        product: review.product,
        rating: review.rating,
      }),
    ),
  ];
  // ISO 8601 en UTC se ordena como texto. `sort` es estable: ante igual
  // instante se conserva el orden usuarios, productos, reseñas.
  return events
    .sort((first, second) => (first.at < second.at ? 1 : first.at > second.at ? -1 : 0))
    .slice(0, ACTIVITY_LIMIT);
}

// Datos del Resumen en una sola llamada (RF-1, D1). `now` es inyectable para
// que los tests con fechas controladas sean deterministas.
export async function getOverview(now: Date = new Date()): Promise<AdminOverview> {
  const since = new Date(now.getTime() - OVERVIEW_DAYS * DAY_MS);
  const [
    userTotal,
    userNew,
    adminCount,
    productTotal,
    featuredCount,
    byCategory,
    totals,
    latest,
    lowReviews,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since } }),
    User.countDocuments({ role: "admin" }),
    Product.countDocuments(),
    Product.countDocuments({ featured: true }),
    productsByCategory(),
    reviewTotals(since),
    // Los 8 más recientes alimentan la actividad; los 4 primeros, la tabla.
    findProducts({}, { ...NEWEST_FIRST }, { skip: 0, limit: ACTIVITY_LIMIT }),
    findAdminReviews(
      { rating: { $lte: LOW_RATING_MAX }, createdAt: { $gte: since } },
      REVIEW_SORTS.recientes,
      { skip: 0, limit: LOW_REVIEWS_LIMIT },
    ),
  ]);
  return {
    users: { total: userTotal, newLast7Days: userNew, admins: adminCount },
    products: {
      total: productTotal,
      featured: featuredCount,
      byCategory,
    },
    reviews: {
      total: totals?.total ?? 0,
      newLast7Days: totals?.newLast7Days ?? 0,
      averageRating: totals ? roundRating(totals.average) : null,
      lowLast7Days: totals?.lowLast7Days ?? 0,
    },
    activity: await recentActivity(latest),
    latestProducts: latest.slice(0, LATEST_PRODUCTS_LIMIT).map(toPublicProduct),
    lowReviews: lowReviews.rows,
  };
}
