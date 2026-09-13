import { navigate, ROUTE_LOGIN, ROUTE_REGISTER } from "../hooks/useHashRouter.ts";

export function AuthBar() {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => navigate(ROUTE_REGISTER)}
        className="rounded-full bg-accent-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-accent-700"
      >
        Registrarse ahora
      </button>
      <button
        type="button"
        onClick={() => navigate(ROUTE_LOGIN)}
        className="rounded-full border-2 border-white/80 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
      >
        Iniciar sesión
      </button>
    </nav>
  );
}