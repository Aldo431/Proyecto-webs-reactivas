import type {
  AdminOverview,
  AdminProduct,
  AdminReview,
  AdminUser,
} from "@tiendadcc/utils";
import { makeProduct } from "./productFixtures.ts";
import { makeReview } from "./reviewFixtures.ts";

// Test-only factories for the admin API contract (spec 013). Tests pass the
// fields they care about; the rest get defaults.

export function makeAdminProduct(
  overrides: Partial<AdminProduct> = {},
): AdminProduct {
  return {
    ...makeProduct({ id: "6713b0c2a1f4e9d2c8b70a01", featured: false }),
    reviewCount: 0,
    averageRating: null,
    ...overrides,
  };
}

export function makeAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "6713b0c2a1f4e9d2c8b70b01",
    username: "anaperez",
    displayName: "Ana Pérez",
    email: "ana@dcc.uchile.cl",
    role: "user",
    emailVerified: false,
    productCount: 0,
    reviewCount: 0,
    createdAt: "2026-11-01T12:00:00.000Z",
    ...overrides,
  };
}

export function makeAdminReview(
  overrides: Partial<AdminReview> = {},
): AdminReview {
  return {
    ...makeReview({ id: "6713b0c2a1f4e9d2c8b70c01" }),
    product: { id: "6713b0c2a1f4e9d2c8b70a01", name: "Taza DCC" },
    ...overrides,
  };
}

export function makeAdminOverview(
  overrides: Partial<AdminOverview> = {},
): AdminOverview {
  return {
    users: { total: 0, newLast7Days: 0, admins: 0 },
    products: {
      total: 0,
      featured: 0,
      byCategory: [
        { category: "Tazas", count: 0 },
        { category: "Poleras", count: 0 },
        { category: "Stickers", count: 0 },
        { category: "Pins", count: 0 },
      ],
    },
    reviews: {
      total: 0,
      newLast7Days: 0,
      averageRating: null,
      lowLast7Days: 0,
    },
    activity: [],
    latestProducts: [],
    lowReviews: [],
    ...overrides,
  };
}

export function makeAdminPage<Item>(
  items: Item[],
  overrides: { total?: number; pagina?: number; totalPaginas?: number } = {},
) {
  return {
    items,
    total: overrides.total ?? items.length,
    pagina: overrides.pagina ?? 1,
    porPagina: 20 as const,
    totalPaginas: overrides.totalPaginas ?? (items.length === 0 ? 0 : 1),
  };
}
