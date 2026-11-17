import { describe, expect, it } from "vitest";
import {
  PRODUCTS_EMPTY,
  PRODUCT_DELETED_NOTICE,
  REVIEWS_EMPTY,
  REVIEW_DELETED_NOTICE,
  deleteProductDescription,
  deleteReviewDescription,
  featuredNotice,
  nextRole,
  roleDialogTexts,
  roleNotice,
} from "./adminMessages.ts";

describe("fixed texts", () => {
  it("match the spec", () => {
    expect(PRODUCTS_EMPTY).toBe("No hay productos que coincidan con los filtros.");
    expect(REVIEWS_EMPTY).toBe("No hay reseñas con este filtro.");
    expect(PRODUCT_DELETED_NOTICE).toBe("Publicación eliminada.");
    expect(REVIEW_DELETED_NOTICE).toBe("Reseña eliminada.");
  });
});

describe("featuredNotice", () => {
  it("announces the product in or out of the home featured list", () => {
    expect(featuredNotice("Taza DCC", true)).toBe(
      "«Taza DCC» ahora aparece en Destacados del inicio.",
    );
    expect(featuredNotice("Taza DCC", false)).toBe(
      "«Taza DCC» ya no está destacado.",
    );
  });
});

describe("deleteProductDescription", () => {
  it("names the seller and every consequence", () => {
    const text = deleteProductDescription("Taza DCC", "ana");

    expect(text).toContain("«Taza DCC»");
    expect(text).toContain("@ana");
    expect(text).toContain("catálogo");
    expect(text).toContain("favoritos");
    expect(text).toContain("historiales");
    expect(text).toContain("carritos");
    expect(text).toContain("también se borrarán sus reseñas");
  });
});

describe("deleteReviewDescription", () => {
  it("matches the spec text", () => {
    expect(deleteReviewDescription("beto", "Taza DCC")).toBe(
      "Se borrará la reseña de @beto sobre «Taza DCC». No se puede deshacer.",
    );
  });
});

describe("roleDialogTexts", () => {
  it("builds the dialog to grant the role", () => {
    expect(roleDialogTexts("ana", "admin")).toEqual({
      title: "¿Hacer administrador a @ana?",
      description:
        "Podrá destacar y eliminar cualquier producto, moderar reseñas y cambiar el rol de otros usuarios.",
      confirmLabel: "Hacer administrador",
    });
  });

  it("builds the dialog to remove the role", () => {
    expect(roleDialogTexts("ana", "user")).toEqual({
      title: "¿Quitar el rol de administrador a @ana?",
      description: "Volverá a ser un usuario normal y dejará de ver este panel.",
      confirmLabel: "Quitar administrador",
    });
  });
});

describe("roleNotice / nextRole", () => {
  it("announces the new role", () => {
    expect(roleNotice("ana", "admin")).toBe("@ana ahora es administrador.");
    expect(roleNotice("ana", "user")).toBe("@ana ahora es usuario.");
  });

  it("flips the role", () => {
    expect(nextRole("user")).toBe("admin");
    expect(nextRole("admin")).toBe("user");
  });
});
