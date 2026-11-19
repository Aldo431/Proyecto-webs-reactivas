import { describe, expect, it } from "vitest";
import { formatOrderDate } from "./orderFormat.ts";

describe("formatOrderDate", () => {
  it("formatea el ISO de creación en español con fecha larga y hora corta", () => {
    const formatted = formatOrderDate("2026-11-17T22:41:03.512Z");

    expect(formatted).not.toBe("");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("17");
    expect(formatted).toContain("noviembre");
  });

  it("devuelve cadena vacía ante una fecha inválida", () => {
    expect(formatOrderDate("ayer")).toBe("");
    expect(formatOrderDate("")).toBe("");
  });
});
