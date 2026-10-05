import { Heart, ShoppingCart, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ComingSoonItem } from "./ComingSoonItem.tsx";
import { Button } from "./ui/button.tsx";

interface HeaderProps {
  showBackButton: boolean;
  backLabel?: string;
}

// Top bar (Home RF-1): the logo links to "/", "Catálogo" is active and the
// future accesses are shown as "próximamente" (icon-only on mobile, Home
// RNF-3). The ">_" prompt is decorative.
export function Header({ showBackButton, backLabel = "Volver" }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link
          to="/"
          className="rounded-md font-mono text-lg font-bold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="mr-2 text-terminal-prompt">
            {">_"}
          </span>
          TiendaDCC
        </Link>
        <nav
          aria-label="Principal"
          className="flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-2"
        >
          <Button asChild variant="ghost" size="sm" className="max-sm:px-2">
            <Link to="/catalogo">Catálogo</Link>
          </Button>
          <ComingSoonItem label="Favoritos" icon={Heart} compactOnMobile />
          <ComingSoonItem label="Carrito" icon={ShoppingCart} compactOnMobile />
          <ComingSoonItem label="Perfil" icon={User} compactOnMobile />
          {showBackButton && (
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              {backLabel}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
