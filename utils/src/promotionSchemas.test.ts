import { describe, expect, it } from "vitest";
import {
  isStudentEmail,
  normalizeEmail,
  pricingQuoteInputSchema,
  promotionInputSchema,
  studentEmailField,
  STUDENT_EMAIL_MESSAGE,
  verificationRequestSchema,
} from "./promotionSchemas.ts";

describe("promotionSchemas", () => {
  it("normaliza y reconoce el correo institucional", () => {
    expect(normalizeEmail("  Ana.Perez@UCHILE.cl ")).toBe("ana.perez@uchile.cl");
    expect(isStudentEmail("Ana.Perez@UCHILE.cl")).toBe(true);
    expect(isStudentEmail("ana@ug.uchile.cl")).toBe(true);
    expect(isStudentEmail("ana@dcc.uchile.cl")).toBe(true);
    expect(isStudentEmail("ana@gmail.com")).toBe(false);
    expect(isStudentEmail("ana@notuchile.cl")).toBe(false);
    expect(isStudentEmail("ana@uchile.cl.evil.com")).toBe(false);
    expect(studentEmailField.safeParse("ANA@uchile.cl").success).toBe(true);
    expect(studentEmailField.safeParse("ana@ug.uchile.cl").success).toBe(true);
    expect(studentEmailField.safeParse("ana@gmail.com").success).toBe(false);
  });

  it("valida la solicitud de verificación con mensaje en español", () => {
    expect(verificationRequestSchema.safeParse({ email: "ana@uchile.cl" }).success).toBe(true);
    expect(verificationRequestSchema.safeParse({ email: "ana@ug.uchile.cl" }).success).toBe(true);
    const result = verificationRequestSchema.safeParse({ email: "ana@gmail.com" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(STUDENT_EMAIL_MESSAGE);
    }
  });

  it("valida tipos, porcentajes y vigencia de promociones", () => {
    expect(
      promotionInputSchema.safeParse({ type: "studentDiscount", label: "20% alumno" }).success,
    ).toBe(true);
    expect(
      promotionInputSchema.safeParse({
        type: "studentDiscount",
        label: "0% alumno",
        percent: 0,
      }).success,
    ).toBe(false);
    expect(
      promotionInputSchema.safeParse({
        type: "descuento",
        label: "Inválida",
      }).success,
    ).toBe(false);
    expect(
      promotionInputSchema.safeParse({
        type: "studentDiscount",
        label: "20% alumno",
        startsAt: "2026-12-01T00:00:00.000Z",
        endsAt: "2026-11-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("rechaza montos del cliente en la cotización", () => {
    const valid = { items: [{ productId: "p1", quantity: 2 }] };
    expect(pricingQuoteInputSchema.safeParse(valid).success).toBe(true);
    expect(
      pricingQuoteInputSchema.safeParse({ ...valid, total: 1 }).success,
    ).toBe(false);
    expect(
      pricingQuoteInputSchema.safeParse({
        items: [{ productId: "p1", quantity: 2, price: 1 }],
      }).success,
    ).toBe(false);
    expect(pricingQuoteInputSchema.safeParse({ items: [] }).success).toBe(false);
  });
});
