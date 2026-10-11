import { describe, expect, it } from "vitest";
import { productPath } from "./productPath.ts";

describe("productPath", () => {
  it("builds the detail path for a product id", () => {
    expect(productPath("taza-dcc")).toBe("/producto/taza-dcc");
  });
});
