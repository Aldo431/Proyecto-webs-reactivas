import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { returnPathFromState } from "../logic/returnPath.ts";

interface OnlyAnonymousRouteProps {
  children: ReactNode;
}

// Auth routes are only for anonymous visitors (005 RF-8): while the session is
// still being restored nothing is rendered (no authenticated flash), and once
// it is known an authenticated user is sent home — or back to the protected
// route the user came from, passed as `state.from` (011 RF-2).
export function OnlyAnonymousRoute({ children }: OnlyAnonymousRouteProps) {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === "loading") {
    return null;
  }
  if (state.status === "authenticated") {
    return <Navigate to={returnPathFromState(location.state)} replace />;
  }
  return <>{children}</>;
}
