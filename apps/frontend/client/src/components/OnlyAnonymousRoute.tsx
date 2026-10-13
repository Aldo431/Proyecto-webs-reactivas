import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";

interface OnlyAnonymousRouteProps {
  children: ReactNode;
}

// Auth routes are only for anonymous visitors (005 RF-8): while the session is
// still being restored nothing is rendered (no authenticated flash), and once
// it is known an authenticated user is sent home.
export function OnlyAnonymousRoute({ children }: OnlyAnonymousRouteProps) {
  const { state } = useAuth();
  if (state.status === "loading") {
    return null;
  }
  if (state.status === "authenticated") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
