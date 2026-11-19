import { describe, expect, it } from "vitest";
import {
  ADMIN_PAGE_SIZE,
  adminActivitySchema,
  adminOverviewSchema,
  adminPageSchema,
  adminProductQuerySchema,
  adminProductSchema,
  adminReviewQuerySchema,
  adminReviewSchema,
  adminUserQuerySchema,
  adminUserSchema,
  setFeaturedInputSchema,
  setRoleInputSchema,
} from "./adminSchemas.ts";

const ISO = "2026-11-10T12:00:00.000Z";

const product = {
  id: "6713b0c2a1f4e9d2c8b70a01",
  name: "Taza DCC",
  description: "Taza blanca.",
  category: "Tazas",
  price: 6000,
  image: "/images/taza-dcc.png",
  featured: false,
  seller: { id: "u1", username: "ana", displayName: "Ana" },
  createdAt: ISO,
  updatedAt: ISO,
};

const review = {
  id: "r1",
  productId: product.id,
  author: { id: "u1", username: "ana", displayName: "Ana" },
  rating: 2,
  comment: "No me gustó.",
  createdAt: ISO,
  updatedAt: ISO,
};

describe("ADMIN_PAGE_SIZE", () => {
  it("es 20", () => {
    expect(ADMIN_PAGE_SIZE).toBe(20);
  });
});

describe("adminProductQuerySchema", () => {
  it("aplica pagina 1 por defecto y deja el resto sin definir", () => {
    expect(adminProductQuerySchema.parse({})).toEqual({ pagina: 1 });
  });

  it("convierte destacados=true en booleano y recorta q", () => {
    const query = adminProductQuerySchema.parse({
      q: "  taza  ",
      categoria: "Tazas",
      destacados: "true",
      pagina: "3",
    });

    expect(query).toEqual({
      q: "taza",
      categoria: "Tazas",
      destacados: true,
      pagina: 3,
    });
  });

  it("trata los valores vacíos como ausentes", () => {
    expect(
      adminProductQuerySchema.parse({ q: "", categoria: "", destacados: "" }),
    ).toEqual({ pagina: 1 });
  });

  it.each([
    ["categoría", { categoria: "Zapatos" }],
    ["destacados", { destacados: "false" }],
    ["página 0", { pagina: "0" }],
    ["página decimal", { pagina: "1.5" }],
    ["q demasiado larga", { q: "a".repeat(101) }],
  ])("rechaza %s inválida", (_label, input) => {
    expect(adminProductQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe("adminUserQuerySchema", () => {
  it("acepta rol admin y user", () => {
    expect(adminUserQuerySchema.parse({ rol: "admin" }).rol).toBe("admin");
    expect(adminUserQuerySchema.parse({ rol: "user" }).rol).toBe("user");
  });

  it("rechaza un rol inválido con mensaje en español", () => {
    const result = adminUserQuerySchema.safeParse({ rol: "root" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "El rol debe ser admin o user.",
      );
    }
  });

  it("rechaza pagina=0", () => {
    expect(adminUserQuerySchema.safeParse({ pagina: "0" }).success).toBe(false);
  });
});

describe("adminReviewQuerySchema", () => {
  it("usa orden recientes por defecto", () => {
    expect(adminReviewQuerySchema.parse({})).toEqual({
      orden: "recientes",
      pagina: 1,
    });
  });

  it("acepta bajas, altas y orden menor", () => {
    expect(
      adminReviewQuerySchema.parse({ calificacion: "bajas", orden: "menor" }),
    ).toEqual({ calificacion: "bajas", orden: "menor", pagina: 1 });
    expect(
      adminReviewQuerySchema.parse({ calificacion: "altas" }).calificacion,
    ).toBe("altas");
  });

  it.each([
    ["calificacion", { calificacion: "medias" }],
    ["orden", { orden: "antiguas" }],
  ])("rechaza %s inválido", (_label, input) => {
    expect(adminReviewQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe("setFeaturedInputSchema", () => {
  it("acepta un booleano", () => {
    expect(setFeaturedInputSchema.parse({ featured: true })).toEqual({
      featured: true,
    });
    expect(setFeaturedInputSchema.parse({ featured: false })).toEqual({
      featured: false,
    });
  });

  it.each([{}, { featured: "true" }, { featured: 1 }, { featured: null }])(
    "rechaza %j con el mensaje de la spec",
    (input) => {
      const result = setFeaturedInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Indica si el producto es destacado.",
        );
      }
    },
  );
});

describe("setRoleInputSchema", () => {
  it("acepta admin y user", () => {
    expect(setRoleInputSchema.parse({ role: "admin" }).role).toBe("admin");
    expect(setRoleInputSchema.parse({ role: "user" }).role).toBe("user");
  });

  it.each([{}, { role: "root" }, { role: 1 }])(
    "rechaza %j con 'Rol inválido.'",
    (input) => {
      const result = setRoleInputSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Rol inválido.");
      }
    },
  );
});

describe("esquemas de respuesta", () => {
  it("adminProductSchema exige reviewCount y acepta averageRating nulo", () => {
    const valid = { ...product, reviewCount: 0, averageRating: null };

    expect(adminProductSchema.safeParse(valid).success).toBe(true);
    expect(adminProductSchema.safeParse(product).success).toBe(false);
    expect(
      adminProductSchema.safeParse({ ...valid, reviewCount: -1 }).success,
    ).toBe(false);
  });

  it("adminUserSchema no deja pasar campos sensibles", () => {
    const parsed = adminUserSchema.parse({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      email: "ana@dcc.uchile.cl",
      role: "user",
      emailVerified: false,
      productCount: 1,
      reviewCount: 2,
      createdAt: ISO,
      passwordHash: "hash",
    });

    expect(parsed).not.toHaveProperty("passwordHash");
  });

  it("adminReviewSchema exige el producto", () => {
    expect(adminReviewSchema.safeParse(review).success).toBe(false);
    expect(
      adminReviewSchema.safeParse({
        ...review,
        product: { id: product.id, name: product.name },
      }).success,
    ).toBe(true);
  });

  it("adminActivitySchema discrimina por type", () => {
    expect(
      adminActivitySchema.safeParse({
        type: "user_registered",
        at: ISO,
        user: { username: "ana" },
      }).success,
    ).toBe(true);
    expect(
      adminActivitySchema.safeParse({
        type: "review_created",
        at: ISO,
        user: { username: "ana" },
        product: { id: "p1", name: "Taza" },
      }).success,
    ).toBe(false);
    expect(
      adminActivitySchema.safeParse({ type: "otro", at: ISO }).success,
    ).toBe(false);
  });

  it("adminOverviewSchema acepta un resumen mínimo con la base vacía", () => {
    const empty = {
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
    };

    expect(adminOverviewSchema.safeParse(empty).success).toBe(true);
    expect(
      adminOverviewSchema.safeParse({ ...empty, users: undefined }).success,
    ).toBe(false);
  });

  it("adminPageSchema valida la lista y los totales", () => {
    const schema = adminPageSchema(adminUserSchema);
    const page = {
      items: [],
      total: 0,
      pagina: 1,
      porPagina: 20,
      totalPaginas: 0,
    };

    expect(schema.safeParse(page).success).toBe(true);
    expect(schema.safeParse({ ...page, porPagina: 9 }).success).toBe(false);
    expect(schema.safeParse({ ...page, pagina: 0 }).success).toBe(false);
  });
});
