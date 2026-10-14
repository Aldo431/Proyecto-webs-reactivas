import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";

interface OnlyAuthenticatedRouteProps {
  children: ReactNode;
}

// Protected routes are only for authenticated users (006 RF-7): while the
// session is still being restored nothing is rendered, and anonymous visitors
// are sent to login.
export function OnlyAuthenticatedRoute({
  children,
}: OnlyAuthenticatedRouteProps) {
  const { state } = useAuth();
  if (state.status === "loading") {
    return null;
  }
  if (state.status === "anonymous") {
    return <Navigate to="/iniciar-sesion" replace />;
  }
  return <>{children}</>;
}
