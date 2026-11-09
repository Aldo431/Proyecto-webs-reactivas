import { describe, expect, it } from "vitest";
import { issuesToFieldErrors } from "./formErrors.ts";
import {
  detectCardBrand,
  expectedCardLength,
  formatCardNumber,
  isCompleteCardNumber,
  isExpiryCurrentOrFuture,
  normalizeCardNumber,
  paymentFormSchema,
} from "./paymentFields.ts";

const NOW = new Date(2026, 10, 8); // 2026-11-08

const validValues = {
  email: "estudiante@dcc.uchile.cl",
  cardNumber: "4111 1111 1111 1111",
  expiry: "12/29",
  cvc: "123",
  holderName: "Estudiante DCC",
};

describe("normalizeCardNumber", () => {
  it("removes spaces, dashes and letters", () => {
    expect(normalizeCardNumber("4111 1111-1111 1111")).toBe("4111111111111111");
    expect(normalizeCardNumber("4111a1111")).toBe("41111111");
    expect(normalizeCardNumber("")).toBe("");
  });
});

describe("formatCardNumber", () => {
  it("groups digits in groups of 4", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("4111 1111 1111 1111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("4111")).toBe("4111");
    expect(formatCardNumber("41111")).toBe("4111 1");
  });

  it("truncates to 16 digits", () => {
    expect(formatCardNumber("41111111111111119999")).toBe(
      "4111 1111 1111 1111",
    );
  });
});

describe("detectCardBrand", () => {
  it("detects Visa with prefix 4", () => {
    expect(detectCardBrand("4111111111111111")).toBe("visa");
  });

  it("detects Mastercard with prefixes 51 to 55", () => {
    expect(detectCardBrand("5100000000000008")).toBe("mastercard");
    expect(detectCardBrand("5500000000000004")).toBe("mastercard");
  });

  it("detects Mastercard in the 2221-2720 range, including the edges", () => {
    expect(detectCardBrand("2221000000000009")).toBe("mastercard");
    expect(detectCardBrand("2720000000000005")).toBe("mastercard");
    expect(detectCardBrand("2220000000000000")).toBe("unknown");
    expect(detectCardBrand("2721000000000005")).toBe("unknown");
  });

  it("detects American Express with prefixes 34 and 37", () => {
    expect(detectCardBrand("378282246310005")).toBe("amex");
    expect(detectCardBrand("341111111111111")).toBe("amex");
  });

  it("returns unknown for other prefixes", () => {
    expect(detectCardBrand("6011111111111117")).toBe("unknown");
    expect(detectCardBrand("")).toBe("unknown");
  });
});

describe("expectedCardLength", () => {
  it("expects 15 digits for Amex and 16 otherwise", () => {
    expect(expectedCardLength("amex")).toBe(15);
    expect(expectedCardLength("visa")).toBe(16);
    expect(expectedCardLength("mastercard")).toBe(16);
    expect(expectedCardLength("unknown")).toBe(16);
  });
});

describe("isCompleteCardNumber", () => {
  it("is true with 16 digits for Visa", () => {
    expect(isCompleteCardNumber("4111 1111 1111 1111")).toBe(true);
    expect(isCompleteCardNumber("4111111111111111")).toBe(true);
  });

  it("is true with 15 digits for Amex", () => {
    expect(isCompleteCardNumber("378282246310005")).toBe(true);
  });

  it("is false with a shorter number", () => {
    expect(isCompleteCardNumber("411111111111")).toBe(false);
  });

  it("is false with 16 digits for Amex and 15 for Visa", () => {
    expect(isCompleteCardNumber("3782822463100056")).toBe(false);
    expect(isCompleteCardNumber("411111111111111")).toBe(false);
  });
});

describe("isExpiryCurrentOrFuture", () => {
  it("accepts a future expiry", () => {
    expect(isExpiryCurrentOrFuture("12/29", NOW)).toBe(true);
  });

  it("accepts the current month", () => {
    expect(isExpiryCurrentOrFuture("11/26", NOW)).toBe(true);
  });

  it("rejects a past month", () => {
    expect(isExpiryCurrentOrFuture("10/26", NOW)).toBe(false);
    expect(isExpiryCurrentOrFuture("01/20", NOW)).toBe(false);
  });

  it("rejects malformed values", () => {
    expect(isExpiryCurrentOrFuture("13/29", NOW)).toBe(false);
    expect(isExpiryCurrentOrFuture("1/29", NOW)).toBe(false);
    expect(isExpiryCurrentOrFuture("1229", NOW)).toBe(false);
  });
});

describe("paymentFormSchema", () => {
  it("accepts valid values", () => {
    const result = paymentFormSchema.safeParse(validValues);
    expect(result.success).toBe(true);
  });

  it("accepts CVC of 3 and 4 digits", () => {
    expect(
      paymentFormSchema.safeParse({ ...validValues, cvc: "123" }).success,
    ).toBe(true);
    expect(
      paymentFormSchema.safeParse({ ...validValues, cvc: "1234" }).success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = paymentFormSchema.safeParse({
      ...validValues,
      email: "no-es-correo",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty or whitespace-only holder name", () => {
    expect(
      paymentFormSchema.safeParse({ ...validValues, holderName: "" }).success,
    ).toBe(false);
    expect(
      paymentFormSchema.safeParse({ ...validValues, holderName: "   " })
        .success,
    ).toBe(false);
  });

  it("rejects a holder name longer than 100 characters", () => {
    expect(
      paymentFormSchema.safeParse({ ...validValues, holderName: "a".repeat(101) })
        .success,
    ).toBe(false);
  });

  it("rejects a card with the wrong length for its brand", () => {
    expect(
      paymentFormSchema.safeParse({
        ...validValues,
        cardNumber: "411111111111111", // Visa de 15 dígitos
      }).success,
    ).toBe(false);
    expect(
      paymentFormSchema.safeParse({
        ...validValues,
        cardNumber: "3782822463100056", // Amex de 16 dígitos
      }).success,
    ).toBe(false);
  });

  it("accepts an Amex card with 15 digits", () => {
    expect(
      paymentFormSchema.safeParse({ ...validValues, cardNumber: "378282246310005" })
        .success,
    ).toBe(true);
  });

  it("rejects malformed expiry values", () => {
    for (const expiry of ["00/29", "13/29", "1/29", "1229", ""]) {
      expect(
        paymentFormSchema.safeParse({ ...validValues, expiry }).success,
        expiry,
      ).toBe(false);
    }
  });

  it("rejects an expired card", () => {
    expect(
      paymentFormSchema.safeParse({ ...validValues, expiry: "01/20" }).success,
    ).toBe(false);
  });

  it("rejects an invalid CVC", () => {
    for (const cvc of ["12", "12345", "abc", ""]) {
      expect(
        paymentFormSchema.safeParse({ ...validValues, cvc }).success,
        cvc,
      ).toBe(false);
    }
  });

  it("maps issues to field errors with issuesToFieldErrors", () => {
    const result = paymentFormSchema.safeParse({
      ...validValues,
      cardNumber: "4111",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = issuesToFieldErrors(result.error);
      expect(errors.cardNumber).toBeDefined();
    }
  });
});
