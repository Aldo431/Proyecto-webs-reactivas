import { describe, expect, it } from "vitest";
import {
  cartLineSchema,
  cartSchema,
  favoriteInputSchema,
  historyInputSchema,
  MAX_PROD_HISTORY,
  profileSchema,
  updateProfileSchema,
} from "./profileSchemas.ts";

const validUpdate = {
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  currentPassword: "secreto123",
};

describe("updateProfileSchema", () => {
  it("acepta una actualización válida", () => {
    expect(updateProfileSchema.safeParse(validUpdate).success).toBe(true);
  });

  it("recorta espacios de username y displayName", () => {
    const result = updateProfileSchema.safeParse({
      ...validUpdate,
      username: "  AnaPerez  ",
      displayName: "  Ana Pérez  ",
      email: "  ana@dcc.uchile.cl  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("anaperez");
      expect(result.data.displayName).toBe("Ana Pérez");
      expect(result.data.email).toBe("ana@dcc.uchile.cl");
    }
  });

  it("rechaza un username vacío o solo con espacios", () => {
    expect(
      updateProfileSchema.safeParse({ ...validUpdate, username: "   " })
        .success,
    ).toBe(false);
  });

  it("rechaza un displayName vacío", () => {
    expect(
      updateProfileSchema.safeParse({ ...validUpdate, displayName: "" })
        .success,
    ).toBe(false);
  });

  it("rechaza un correo mal formado", () => {
    expect(
      updateProfileSchema.safeParse({ ...validUpdate, email: "ana@" }).success,
    ).toBe(false);
  });

  it("rechaza una contraseña actual vacía", () => {
    expect(
      updateProfileSchema.safeParse({ ...validUpdate, currentPassword: "" })
        .success,
    ).toBe(false);
  });
});

describe("favoriteInputSchema y historyInputSchema", () => {
  it("aceptan un productId válido", () => {
    expect(
      favoriteInputSchema.safeParse({ productId: "taza-dcc" }).success,
    ).toBe(true);
    expect(historyInputSchema.safeParse({ productId: "taza-dcc" }).success).toBe(
      true,
    );
  });

  it("recortan espacios del productId", () => {
    const result = favoriteInputSchema.safeParse({
      productId: "  taza-dcc  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productId).toBe("taza-dcc");
    }
  });

  it("rechazan un productId vacío o solo con espacios", () => {
    expect(favoriteInputSchema.safeParse({ productId: "" }).success).toBe(
      false,
    );
    expect(historyInputSchema.safeParse({ productId: "   " }).success).toBe(
      false,
    );
  });
});

describe("cartLineSchema y cartSchema", () => {
  it("aceptan una línea válida", () => {
    expect(
      cartLineSchema.safeParse({ productId: "taza-dcc", quantity: 2 }).success,
    ).toBe(true);
  });

  it("rechazan cantidad cero, negativa o no entera", () => {
    expect(
      cartLineSchema.safeParse({ productId: "taza-dcc", quantity: 0 }).success,
    ).toBe(false);
    expect(
      cartLineSchema.safeParse({ productId: "taza-dcc", quantity: -1 }).success,
    ).toBe(false);
    expect(
      cartLineSchema.safeParse({ productId: "taza-dcc", quantity: 1.5 }).success,
    ).toBe(false);
  });

  it("rechazan un productId vacío en la línea", () => {
    expect(cartLineSchema.safeParse({ productId: "", quantity: 1 }).success).toBe(
      false,
    );
  });

  it("aceptan un carrito vacío para el vaciado explícito", () => {
    expect(cartSchema.safeParse([]).success).toBe(true);
  });
});

describe("MAX_PROD_HISTORY", () => {
  it("vale 67", () => {
    expect(MAX_PROD_HISTORY).toBe(67);
  });
});

describe("profileSchema", () => {
  it("acepta un perfil completo sin passwordHash", () => {
    const result = profileSchema.safeParse({
      id: "6712a4f3c9b1e24a8f0d1234",
      username: "anaperez",
      displayName: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      emailVerified: false,
      favorites: ["taza-dcc"],
      history: [
        { productId: "polera-dcc", viewedAt: "2026-10-13T10:00:00.000Z" },
      ],
      cart: [{ productId: "taza-dcc", quantity: 2 }],
    });

    expect(result.success).toBe(true);
  });

  it("rechaza un perfil sin los campos de la cuenta", () => {
    expect(
      profileSchema.safeParse({
        id: "6712a4f3c9b1e24a8f0d1234",
        username: "anaperez",
        displayName: "Ana Pérez",
        email: "ana@dcc.uchile.cl",
      }).success,
    ).toBe(false);
  });
});
