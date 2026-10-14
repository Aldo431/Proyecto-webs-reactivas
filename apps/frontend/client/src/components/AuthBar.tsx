import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { Button } from "./ui/button.tsx";

// Main accesses of the home hero (RF-6, Home RF-3): links rendered with the
// Button primitive through asChild, so no button is nested inside a link.
// Stacked on mobile, in a wrapping row from `sm` up (Home RNF-3). Before the
// session is known a neutral state is shown, so "Registrarse ahora" and
// "Iniciar sesión" never appear to a user who turns out to be authenticated.
export function AuthBar() {
  const navigate = useNavigate();
  const { state, logout } = useAuth();

  const layout =
    "flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start";

  if (state.status === "loading") {
    return (
      <nav aria-label="Accesos principales" aria-busy="true" className={layout}>
        <span className="text-sm text-muted-foreground">Cargando sesión…</span>
      </nav>
    );
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (state.status === "authenticated") {
    return (
      <nav aria-label="Accesos de usuario" className={layout}>
        <span className="text-sm text-foreground">
          Hola,{" "}
          <span className="font-mono font-semibold">{state.user.displayName}</span>
        </span>
        <Button asChild variant="secondary" size="lg">
          <Link to="/catalogo">Ver Catálogo</Link>
        </Button>
        <Button
          variant="outline"
          size="lg"
          type="button"
          onClick={() => {
            void handleLogout();
          }}
        >
          Cerrar sesión
        </Button>
      </nav>
    );
  }

  return (
    <nav aria-label="Accesos principales" className={layout}>
      <Button asChild variant="brand" size="lg">
        <Link to="/registro">Registrarse ahora</Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link to="/iniciar-sesion">Iniciar sesión</Link>
      </Button>
      <Button asChild variant="secondary" size="lg">
        <Link to="/catalogo">Ver Catálogo</Link>
      </Button>
    </nav>
  );
}
