import { describe, expect, it } from "vitest";
import { isValidResetToken } from "./resetToken.ts";

describe("isValidResetToken", () => {
  it("accepts exactly 64 lowercase hexadecimal characters", () => {
    expect(isValidResetToken("a1b2c3d4".repeat(8))).toBe(true);
  });

  it("rejects tokens shorter or longer than 64 characters", () => {
    expect(isValidResetToken("a".repeat(63))).toBe(false);
    expect(isValidResetToken("a".repeat(65))).toBe(false);
  });

  it("rejects non-hexadecimal characters and empty input", () => {
    expect(isValidResetToken("g".repeat(64))).toBe(false);
    expect(isValidResetToken("a".repeat(63) + "-" )).toBe(false);
    expect(isValidResetToken("")).toBe(false);
  });
});
