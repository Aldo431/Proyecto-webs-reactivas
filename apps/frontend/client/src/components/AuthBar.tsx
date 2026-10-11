import { Link } from "react-router-dom";
import { Button } from "./ui/button.tsx";

// Main accesses of the home hero (Home RF-3): links rendered with the Button
// primitive through asChild, so no button is nested inside a link. Stacked
// on mobile, in a wrapping row from `sm` up (Home RNF-3).
export function AuthBar() {
  return (
    <nav
      aria-label="Accesos principales"
      className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start"
    >
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
