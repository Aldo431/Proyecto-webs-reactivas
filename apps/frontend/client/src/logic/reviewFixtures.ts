import type { Review } from "@tiendadcc/utils";

// Test-only factory for Review objects (the public API contract). Tests pass
// the fields they care about; the rest get defaults, so a new field only
// changes this file.
export function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "6713b0c2a1f4e9d2c8b70a99",
    productId: "68f1c2a9b3d4e5f60718293a",
    author: {
      id: "6713b0c2a1f4e9d2c8b70a00",
      username: "anaperez",
      displayName: "Ana Pérez",
    },
    rating: 4,
    comment: "Muy buena calidad.",
    createdAt: "2026-10-14T12:00:00.000Z",
    updatedAt: "2026-10-14T12:00:00.000Z",
    ...overrides,
  };
}
