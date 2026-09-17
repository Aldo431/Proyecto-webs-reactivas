import { describe, expect, it } from "vitest";
import {
  buildProductRoute,
  parseHomeRoute,
  parseLoginRoute,
  parseProductRoute,
  parseRegisterRoute,
  parseRoute,
} from "./routeParser.ts";

describe("parseRoute", () => {
  it("maps an empty hash to home", () => {
    expect(parseRoute("")).toEqual({ name: "home" });
  });

  it("maps a bare hash symbol to home", () => {
    expect(parseRoute("#")).toEqual({ name: "home" });
  });

  it("maps the root hash to home", () => {
    expect(parseRoute("#/")).toEqual({ name: "home" });
  });

  it("maps the register hash to register", () => {
    expect(parseRoute("#/registro")).toEqual({ name: "register" });
  });

  it("maps the login hash to login", () => {
    expect(parseRoute("#/iniciar-sesion")).toEqual({ name: "login" });
  });

  it("maps the product hash to the product route with its id", () => {
    expect(parseRoute("#/producto/taza-dcc")).toEqual({
      name: "product",
      productId: "taza-dcc",
    });
  });

  it("decodes the product id once", () => {
    expect(parseRoute("#/producto/taza%20dcc")).toEqual({
      name: "product",
      productId: "taza dcc",
    });
  });

  it("maps unknown hashes to unknown", () => {
    expect(parseRoute("#/carrito")).toEqual({ name: "unknown" });
  });

  it("maps malformed hashes to unknown", () => {
    expect(parseRoute("#/REGISTRO")).toEqual({ name: "unknown" });
    expect(parseRoute("#/registro/extra")).toEqual({ name: "unknown" });
    expect(parseRoute("registro")).toEqual({ name: "unknown" });
  });

  it("maps product hashes without id or with extra segments to unknown", () => {
    expect(parseRoute("#/producto")).toEqual({ name: "unknown" });
    expect(parseRoute("#/producto/")).toEqual({ name: "unknown" });
    expect(parseRoute("#/producto/taza-dcc/extra")).toEqual({
      name: "unknown",
    });
  });

  it("maps malformed product hashes to unknown", () => {
    expect(parseRoute("#/PRODUCTO/taza-dcc")).toEqual({ name: "unknown" });
    expect(parseRoute("#/producto/%")).toEqual({ name: "unknown" });
  });
});

describe("buildProductRoute", () => {  it("builds the detail hash for a product id", () => {
    expect(buildProductRoute("taza-dcc")).toBe("#/producto/taza-dcc");
  });

  it("encodes special characters and round-trips through parseRoute", () => {
    const hash = buildProductRoute("taza dcc");
    expect(hash).toBe("#/producto/taza%20dcc");
    expect(parseRoute(hash)).toEqual({
      name: "product",
      productId: "taza dcc",
    });
  });
});

describe("per-route parsers", () => {
  it("each static parser only resolves its own path", () => {
    expect(parseHomeRoute("/")).toEqual({ name: "home" });
    expect(parseHomeRoute("/registro")).toBeNull();
    expect(parseRegisterRoute("/registro")).toEqual({ name: "register" });
    expect(parseRegisterRoute("/")).toBeNull();
    expect(parseLoginRoute("/iniciar-sesion")).toEqual({ name: "login" });
    expect(parseLoginRoute("/registro")).toBeNull();
  });

  it("parseProductRoute resolves a valid product path", () => {
    expect(parseProductRoute("/producto/taza-dcc")).toEqual({
      name: "product",
      productId: "taza-dcc",
    });
  });

  it("parseProductRoute returns null outside its own shape", () => {
    expect(parseProductRoute("/registro")).toBeNull();
    expect(parseProductRoute("/producto")).toBeNull();
    expect(parseProductRoute("/producto/")).toBeNull();
    expect(parseProductRoute("/producto/taza-dcc/extra")).toBeNull();
    expect(parseProductRoute("/producto/%")).toBeNull();
  });
});
