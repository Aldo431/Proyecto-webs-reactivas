import type { PublicUser } from "@tiendadcc/utils";
import type { AuthState } from "../context/AuthContext.tsx";

export type AdminAccess = "wait" | "login" | "forbidden" | "allow";

// Decides what the admin area does with the current session (012 RF-6).
// Only a convenience: the real authorization lives in the backend.
export function resolveAdminAccess(state: AuthState): AdminAccess {
  if (state.status === "loading") {
    return "wait";
  }
  if (state.status === "anonymous") {
    return "login";
  }
  return isAdmin(state.user) ? "allow" : "forbidden";
}

export function isAdmin(user: PublicUser | null): boolean {
  return user?.role === "admin";
}
