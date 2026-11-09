import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";

interface OnlyAuthenticatedRouteProps {
  children: ReactNode;
}

// Protected routes are only for authenticated users (006 RF-7): while the
// session is still being restored nothing is rendered, and anonymous visitors
// are sent to login. The current path is passed as `state.from` so the login
// can return the user to the protected view afterwards (011 RF-2).
export function OnlyAuthenticatedRoute({
  children,
}: OnlyAuthenticatedRouteProps) {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === "loading") {
    return null;
  }
  if (state.status === "anonymous") {
    return (
      <Navigate
        to="/iniciar-sesion"
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  return <>{children}</>;
}
