import { describe, expect, it } from "vitest";
import {
  EMPTY_PRODUCT_FORM,
  FIELD_ORDER,
  buildCreateInput,
  buildUpdateInput,
  parsePriceInput,
  valuesFromProduct,
  type ProductFormValues,
} from "./productForm.ts";
import { makeProduct } from "./productFixtures.ts";

// PNG de 1x1 válido (firma real).
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";

const valid: ProductFormValues = {
  name: "Taza DCC",
  description: "Una taza para programar.",
  category: "Tazas",
  price: "5990",
  image: PNG,
};

describe("parsePriceInput", () => {
  it("parses digits", () => {
    expect(parsePriceInput(" 12000 ")).toEqual({ ok: true, value: 12000 });
  });

  it.each(["", "  "])("rejects empty input %j", (raw) => {
    expect(parsePriceInput(raw)).toEqual({
      ok: false,
      message: "Ingresa un precio válido.",
    });
  });

  it.each(["12.000", "12,5", "-5", "abc", "1e3"])("rejects %s", (raw) => {
    expect(parsePriceInput(raw).ok).toBe(false);
  });
});

describe("buildCreateInput", () => {
  it("returns the validated input", () => {
    expect(buildCreateInput(valid)).toEqual({
      ok: true,
      input: {
        name: "Taza DCC",
        description: "Una taza para programar.",
        category: "Tazas",
        price: 5990,
        image: PNG,
      },
    });
  });

  it("reports an error for every empty field in order", () => {
    const result = buildCreateInput(EMPTY_PRODUCT_FORM);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors)).toEqual([...FIELD_ORDER]);
      expect(result.fieldErrors.image).toBe("La imagen es obligatoria.");
      expect(result.fieldErrors.price).toBe("Ingresa un precio válido.");
    }
  });

  it("reports the price format error alongside other field errors", () => {
    const result = buildCreateInput({ ...valid, name: "", price: "1.5" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.name).toBe("El nombre es obligatorio.");
      expect(result.fieldErrors.price).toContain("sin puntos ni decimales");
    }
  });

  it("rejects an image with an invalid type", () => {
    const result = buildCreateInput({ ...valid, image: "data:image/gif;base64,R0lGODlh" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.image).toBe(
        "Formato de imagen no permitido. Usa JPG, PNG o WebP.",
      );
    }
  });
});

describe("buildUpdateInput", () => {
  const initial = valuesFromProduct(makeProduct({ price: 5990 }));

  it("fails with a form-level message when nothing changed", () => {
    expect(buildUpdateInput(initial, initial)).toEqual({
      ok: false,
      fieldErrors: {},
      formError: "No hay cambios para guardar.",
    });
  });

  it("reports field errors for invalid edits", () => {
    const result = buildUpdateInput(
      { ...initial, name: "", price: "1.5", category: "" },
      initial,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual([
        "category",
        "name",
        "price",
      ]);
    }
  });

  it("sends only changed fields and omits the image", () => {
    expect(buildUpdateInput({ ...initial, price: "7000" }, initial)).toEqual({
      ok: true,
      input: { price: 7000 },
    });
  });

  it("includes a new image", () => {
    const result = buildUpdateInput({ ...initial, image: PNG }, initial);
    expect(result).toEqual({ ok: true, input: { image: PNG } });
  });
});
