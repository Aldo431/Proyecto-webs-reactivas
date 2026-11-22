import { describe, expect, it } from "vitest";
import { generateMfaCode, hashMfaCode, safeEqualMfaCode } from "./mfaCode.ts";

describe("mfaCode", () => {
  it("genera códigos de seis dígitos", () => {
    for (let index = 0; index < 50; index += 1) {
      const code = generateMfaCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("hashea de forma estable y distingue códigos", () => {
    expect(hashMfaCode("123456")).toBe(hashMfaCode("123456"));
    expect(hashMfaCode("123456")).not.toBe(hashMfaCode("654321"));
  });

  it("compara hashes con longitud y contenido", () => {
    const hash = hashMfaCode("123456");
    expect(safeEqualMfaCode(hash, hash)).toBe(true);
    expect(safeEqualMfaCode(hash, hashMfaCode("000000"))).toBe(false);
    expect(safeEqualMfaCode(hash, "abc")).toBe(false);
  });
});
