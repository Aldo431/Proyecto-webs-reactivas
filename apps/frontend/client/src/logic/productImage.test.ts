import { describe, expect, it } from "vitest";
import { resolveImageUrl } from "./productImage.ts";

describe("resolveImageUrl", () => {
  it("leaves site image paths untouched", () => {
    expect(resolveImageUrl("/images/taza-dcc.png", "https://api.dcc.cl")).toBe(
      "/images/taza-dcc.png",
    );
  });

  it("leaves absolute URLs and data URLs untouched", () => {
    for (const image of [
      "https://cdn.dcc.cl/a.png",
      "http://localhost:3001/a.png",
      "data:image/png;base64,AAAA",
    ]) {
      expect(resolveImageUrl(image, "https://api.dcc.cl")).toBe(image);
    }
  });

  it("keeps API paths relative when there is no base URL (same origin)", () => {
    expect(resolveImageUrl("/api/products/abc/image?v=1", "")).toBe(
      "/api/products/abc/image?v=1",
    );
  });

  it("prefixes API paths with the base URL, without doubling slashes", () => {
    expect(
      resolveImageUrl("/api/products/abc/image?v=1", "https://api.dcc.cl"),
    ).toBe("https://api.dcc.cl/api/products/abc/image?v=1");
    expect(
      resolveImageUrl("/api/products/abc/image?v=1", "https://api.dcc.cl//"),
    ).toBe("https://api.dcc.cl/api/products/abc/image?v=1");
  });

  it("defaults to the configured API base URL", () => {
    expect(resolveImageUrl("/images/x.png")).toBe("/images/x.png");
  });
});
