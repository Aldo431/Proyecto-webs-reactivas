import { z } from "zod";
import { USER_ROLES, userRoleSchema } from "./authSchemas.ts";
import {
  emptyToUndefined,
  pageQueryField,
  productCategorySchema,
  productSchema,
  searchQueryField,
} from "./productSchemas.ts";
import { RATING_MAX, reviewSchema } from "./reviewSchemas.ts";

// Tamaño de página de todas las listas del panel (spec 013, convenciones).
export const ADMIN_PAGE_SIZE = 20;

export const ADMIN_REVIEW_RATING_FILTERS = ["bajas", "altas"] as const;
export const ADMIN_REVIEW_SORT_ORDERS = ["recientes", "menor"] as const;

// --- Consultas (GET) ---------------------------------------------------------

export const adminProductQuerySchema = z.object({
  q: searchQueryField,
  categoria: z.preprocess(
    emptyToUndefined,
    productCategorySchema.optional(),
  ),
  destacados: z.preprocess(
    emptyToUndefined,
    z
      .enum(["true"], { error: "El filtro de destacados debe ser true." })
      .transform(() => true)
      .optional(),
  ),
  pagina: pageQueryField,
});

export const adminUserQuerySchema = z.object({
  q: searchQueryField,
  rol: z.preprocess(
    emptyToUndefined,
    z
      .enum(USER_ROLES, { error: "El rol debe ser admin o user." })
      .optional(),
  ),
  pagina: pageQueryField,
});

export const adminReviewQuerySchema = z.object({
  calificacion: z.preprocess(
    emptyToUndefined,
    z
      .enum(ADMIN_REVIEW_RATING_FILTERS, {
        error: "La calificación debe ser bajas o altas.",
      })
      .optional(),
  ),
  orden: z.preprocess(
    emptyToUndefined,
    z
      .enum(ADMIN_REVIEW_SORT_ORDERS, {
        error: "El orden debe ser recientes o menor.",
      })
      .default("recientes"),
  ),
  pagina: pageQueryField,
});

// --- Cuerpos (PATCH) ---------------------------------------------------------

export const setFeaturedInputSchema = z.object({
  featured: z.boolean({ error: "Indica si el producto es destacado." }),
});

export const setRoleInputSchema = z.object({
  role: z.enum(USER_ROLES, { error: "Rol inválido." }),
});

// --- Respuestas --------------------------------------------------------------

const averageRatingField = z.number().min(0).max(RATING_MAX).nullable();

export const adminProductSchema = productSchema.extend({
  reviewCount: z.number().int().min(0),
  averageRating: averageRatingField,
});

export const adminUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.email(),
  role: userRoleSchema,
  emailVerified: z.boolean(),
  productCount: z.number().int().min(0),
  reviewCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});

export const adminReviewSchema = reviewSchema.extend({
  product: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
});

const activityUserSchema = z.object({ username: z.string().min(1) });
const activityProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const adminActivitySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user_registered"),
    at: z.iso.datetime(),
    user: activityUserSchema,
  }),
  z.object({
    type: z.literal("product_published"),
    at: z.iso.datetime(),
    user: activityUserSchema,
    product: activityProductSchema,
  }),
  z.object({
    type: z.literal("review_created"),
    at: z.iso.datetime(),
    user: activityUserSchema,
    product: activityProductSchema,
    rating: z.number().int().min(1).max(RATING_MAX),
  }),
]);

const count = z.number().int().min(0);

export const adminOverviewSchema = z.object({
  users: z.object({
    total: count,
    newLast7Days: count,
    admins: count,
  }),
  products: z.object({
    total: count,
    featured: count,
    byCategory: z.array(
      z.object({ category: productCategorySchema, count }),
    ),
  }),
  reviews: z.object({
    total: count,
    newLast7Days: count,
    averageRating: averageRatingField,
    lowLast7Days: count,
  }),
  activity: z.array(adminActivitySchema),
  latestProducts: z.array(productSchema),
  lowReviews: z.array(adminReviewSchema),
});

export function adminPageSchema<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    total: count,
    pagina: z.number().int().min(1),
    porPagina: z.literal(ADMIN_PAGE_SIZE),
    totalPaginas: count,
  });
}

export type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type AdminReviewQuery = z.infer<typeof adminReviewQuerySchema>;
export type SetFeaturedInput = z.infer<typeof setFeaturedInputSchema>;
export type SetRoleInput = z.infer<typeof setRoleInputSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminReview = z.infer<typeof adminReviewSchema>;
export type AdminActivity = z.infer<typeof adminActivitySchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminPage<Item> = {
  items: Item[];
  total: number;
  pagina: number;
  porPagina: typeof ADMIN_PAGE_SIZE;
  totalPaginas: number;
};
