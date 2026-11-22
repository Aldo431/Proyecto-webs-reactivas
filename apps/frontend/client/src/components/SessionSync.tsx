import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "../stores/authStore.ts";

interface SessionSyncProps {
  children?: ReactNode;
}

// Restaura la sesión al cargar la app (spec 005; spec 015, RF-1): llama una
// vez a `refresh()` del store de sesión. No provee contexto: el estado vive en
// Zustand; `children` es opcional solo para montar árboles en tests.
export function SessionSync({ children }: SessionSyncProps) {
  useEffect(() => {
    void useAuthStore.getState().refresh();
  }, []);
  return <>{children}</>;
}
