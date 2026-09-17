import { useNavigate } from "react-router-dom";

export function AuthBar() {
  const navigate = useNavigate();
  return (
    <nav className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => navigate("/registro")}
        className="rounded-full bg-accent-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-accent-700"
      >
        Registrarse ahora
      </button>
      <button
        type="button"
        onClick={() => navigate("/iniciar-sesion")}
        className="rounded-full border-2 border-white/80 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
      >
        Iniciar sesión
      </button>
    </nav>
  );
}