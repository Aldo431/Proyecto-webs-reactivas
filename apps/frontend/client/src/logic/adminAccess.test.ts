import type { PublicUser } from "@tiendadcc/utils";
import { describe, expect, it } from "vitest";
import type { AuthState } from "../stores/authStore.ts";
import { isAdmin, resolveAdminAccess } from "./adminAccess.ts";

const user: PublicUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  role: "user",
};
const admin: PublicUser = { ...user, role: "admin" };

describe("resolveAdminAccess", () => {
  it("waits while the session is loading", () => {
    expect(resolveAdminAccess({ status: "loading", user: null })).toBe("wait");
  });

  it("sends anonymous visitors to login", () => {
    expect(resolveAdminAccess({ status: "anonymous", user: null })).toBe(
      "login",
    );
  });

  it("forbids a regular user", () => {
    const state: AuthState = { status: "authenticated", user };
    expect(resolveAdminAccess(state)).toBe("forbidden");
  });

  it("allows an admin", () => {
    const state: AuthState = { status: "authenticated", user: admin };
    expect(resolveAdminAccess(state)).toBe("allow");
  });
});

describe("isAdmin", () => {
  it("is true only for the admin role", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(user)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
