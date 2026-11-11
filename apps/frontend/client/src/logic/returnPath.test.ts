import { describe, expect, it } from "vitest";
import { returnPathFromState } from "./returnPath.ts";

describe("returnPathFromState", () => {
  it("returns the internal path passed as state.from", () => {
    expect(returnPathFromState({ from: "/pago" })).toBe("/pago");
    expect(returnPathFromState({ from: "/perfil" })).toBe("/perfil");
  });

  it("falls back to / when there is no state or no from", () => {
    expect(returnPathFromState(null)).toBe("/");
    expect(returnPathFromState(undefined)).toBe("/");
    expect(returnPathFromState({})).toBe("/");
  });

  it("rejects external or protocol-relative paths", () => {
    expect(returnPathFromState({ from: "//evil.example.com" })).toBe("/");
    expect(returnPathFromState({ from: "https://evil.example.com" })).toBe("/");
    expect(returnPathFromState({ from: "pago" })).toBe("/");
  });

  it("rejects non-string values", () => {
    expect(returnPathFromState({ from: 123 })).toBe("/");
    expect(returnPathFromState({ from: null })).toBe("/");
  });
});
