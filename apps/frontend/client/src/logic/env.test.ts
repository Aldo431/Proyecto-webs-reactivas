import { describe, expect, it } from "vitest";
import { parseApiUrl } from "./env.ts";

describe("parseApiUrl", () => {
  it("acepta una URL vacía (mismo origen vía proxy)", () => {
    const result = parseApiUrl("");
    expect(result).toEqual({ success: true, apiUrl: "" });
  });

  it("acepta una URL absoluta", () => {
    const result = parseApiUrl("https://api.tiendadcc.cl");
    expect(result).toEqual({
      success: true,
      apiUrl: "https://api.tiendadcc.cl",
    });
  });

  it("rechaza una cadena que no es una URL", () => {
    const result = parseApiUrl("no-es-una-url");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("VITE_API_URL");
    }
  });

  it("usa el valor por defecto vacío si la variable no está definida", () => {
    expect(parseApiUrl(undefined)).toEqual({ success: true, apiUrl: "" });
  });
});