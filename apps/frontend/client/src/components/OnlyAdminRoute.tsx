import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { resolveAdminAccess } from "../logic/adminAccess.ts";

interface OnlyAdminRouteProps {
  children: ReactNode;
}

// Admin routes are only for administrators (012 RF-6): nothing is rendered
// while the session is restored, anonymous visitors go to login with
// `state.from` (like OnlyAuthenticatedRoute) and regular users go home. The
// decision lives in `resolveAdminAccess`; the API enforces it for real.
export function OnlyAdminRoute({ children }: OnlyAdminRouteProps) {
  const { state } = useAuth();
  const location = useLocation();
  const access = resolveAdminAccess(state);
  if (access === "wait") {
    return null;
  }
  if (access === "login") {
    return (
      <Navigate
        to="/iniciar-sesion"
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  if (access === "forbidden") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
