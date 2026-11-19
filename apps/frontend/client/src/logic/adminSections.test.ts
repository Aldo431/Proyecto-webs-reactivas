import { describe, expect, it } from "vitest";
import {
  ADMIN_SECTIONS,
  getAdminSection,
  isActiveSection,
} from "./adminSections.ts";

describe("ADMIN_SECTIONS", () => {
  it("lists the four sections in order with unique paths", () => {
    expect(ADMIN_SECTIONS.map((section) => section.label)).toEqual([
      "Resumen",
      "Productos",
      "Usuarios",
      "Reseñas",
    ]);
    expect(ADMIN_SECTIONS.map((section) => section.path)).toEqual([
      "/admin",
      "/admin/productos",
      "/admin/usuarios",
      "/admin/resenas",
    ]);
  });

  it("gives every section a description", () => {
    for (const section of ADMIN_SECTIONS) {
      expect(section.description.length).toBeGreaterThan(0);
    }
  });
});

describe("isActiveSection", () => {
  it("matches the overview only on the exact /admin path", () => {
    expect(isActiveSection("/admin", "/admin")).toBe(true);
    expect(isActiveSection("/admin", "/admin/")).toBe(true);
    expect(isActiveSection("/admin", "/admin/productos")).toBe(false);
    expect(isActiveSection("/admin", "/")).toBe(false);
  });

  it("matches the other sections and their subpaths", () => {
    expect(isActiveSection("/admin/productos", "/admin/productos")).toBe(true);
    expect(isActiveSection("/admin/productos", "/admin/productos/abc")).toBe(
      true,
    );
    expect(isActiveSection("/admin/productos", "/admin/usuarios")).toBe(false);
  });

  it("does not match a path that only shares a prefix", () => {
    expect(isActiveSection("/admin/usuarios", "/admin/usuarios-extra")).toBe(
      false,
    );
  });
});

describe("getAdminSection", () => {
  it("finds a section by path", () => {
    expect(getAdminSection("/admin/usuarios").label).toBe("Usuarios");
  });

  it("throws for an unknown path", () => {
    expect(() => getAdminSection("/admin/otra")).toThrow();
  });
});
