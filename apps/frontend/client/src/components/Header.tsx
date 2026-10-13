import { Heart, Menu, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import { getCartBadgeText } from "../logic/cartCalculations.ts";
import { Button } from "./ui/button.tsx";
import { Badge } from "./ui/badge.tsx";

// Top bar (Home RF-1, 007 RF-3/4/5): the logo links to "/", the cart is
// always visible and the account accesses show the displayName with session.
// Below `sm` the navigation collapses into a hamburger menu (the logo and
// the cart stay visible); there is no "Volver" button (007 RF-4). The ">_"
// prompt is decorative.
export function Header() {
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const { totalCount, isOpen, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const badgeText = getCartBadgeText(totalCount);
  const isAuthenticated = authState.status === "authenticated";
  const displayName =
    authState.status === "authenticated" ? authState.user.displayName : null;

  function goToFavorites() {
    setMenuOpen(false);
    if (isAuthenticated) {
      navigate("/perfil", { state: { section: "favoritos" } });
    } else {
      navigate("/iniciar-sesion");
    }
  }

  function goToProfile() {
    setMenuOpen(false);
    navigate(isAuthenticated ? "/perfil" : "/iniciar-sesion");
  }

  function closeMenuReturningFocus() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenuReturningFocus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
        <div className="flex items-center gap-x-1">
          <nav
            aria-label="Principal"
            className="hidden items-center gap-x-1 sm:flex sm:gap-x-2"
          >
            <Button asChild variant="ghost" size="sm" className="max-sm:px-2">
              <Link to="/catalogo">Catálogo</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="max-sm:px-2"
              aria-label="Favoritos"
              onClick={goToFavorites}
            >
              <Heart aria-hidden="true" />
              <span className="hidden sm:inline">Favoritos</span>
            </Button>
            {displayName !== null ? (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="max-w-36"
                aria-label="Mi perfil"
                onClick={goToProfile}
              >
                <span className="truncate font-mono">{displayName}</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="max-sm:px-2"
                aria-label="Perfil"
                onClick={goToProfile}
              >
                <span className="hidden sm:inline">Perfil</span>
              </Button>
            )}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="max-sm:px-2"
            aria-expanded={isOpen}
            aria-label={
              totalCount > 0
                ? `Carrito, ${totalCount} artículos`
                : "Carrito"
            }
            onClick={openCart}
          >
            <ShoppingCart aria-hidden="true" />
            <span className="hidden sm:inline">Carrito</span>
            {badgeText !== null && (
              <Badge variant="default" className="font-mono">
                {badgeText}
              </Badge>
            )}
          </Button>
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="sm"
            type="button"
            className="sm:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => {
              if (menuOpen) {
                closeMenuReturningFocus();
              } else {
                setMenuOpen(true);
              }
            }}
          >
            {menuOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      {menuOpen && (
        <nav
          aria-label="Menú"
          className="flex flex-col gap-1 border-t border-border px-4 py-3 sm:hidden"
        >
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="justify-start"
          >
            <Link to="/catalogo" onClick={() => setMenuOpen(false)}>
              Catálogo
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="justify-start"
            onClick={goToFavorites}
          >
            <Heart aria-hidden="true" />
            Favoritos
          </Button>
          {displayName !== null ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="justify-start"
              aria-label="Mi perfil"
              onClick={goToProfile}
            >
              <span className="truncate font-mono">{displayName}</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="justify-start"
              onClick={goToProfile}
            >
              Perfil
            </Button>
          )}
        </nav>
      )}
    </header>
  );
}
