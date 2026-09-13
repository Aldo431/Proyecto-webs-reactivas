import { describe, expect, it } from "vitest";
import { parseRoute } from "./routeParser.ts";

describe("parseRoute", () => {
  it("maps an empty hash to home", () => {
    expect(parseRoute("")).toBe("home");
  });

  it("maps a bare hash symbol to home", () => {
    expect(parseRoute("#")).toBe("home");
  });

  it("maps the root hash to home", () => {
    expect(parseRoute("#/")).toBe("home");
  });

  it("maps the register hash to register", () => {
    expect(parseRoute("#/registro")).toBe("register");
  });

  it("maps the login hash to login", () => {
    expect(parseRoute("#/iniciar-sesion")).toBe("login");
  });

  it("maps unknown hashes to unknown", () => {
    expect(parseRoute("#/carrito")).toBe("unknown");
  });

  it("maps malformed hashes to unknown", () => {
    expect(parseRoute("#/REGISTRO")).toBe("unknown");
    expect(parseRoute("#/registro/extra")).toBe("unknown");
    expect(parseRoute("registro")).toBe("unknown");
  });
});