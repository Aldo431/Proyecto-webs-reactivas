import { Link } from "react-router-dom";
import { Button } from "./ui/button.tsx";

interface CartEmptyStateProps {
  onNavigate: () => void;
}

export function CartEmptyState({ onNavigate }: CartEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <p className="font-sans text-sm text-muted-foreground">
        Tu carrito está vacío.
      </p>
      <Button asChild variant="default">
        <Link to="/catalogo" onClick={onNavigate}>
          Explorar catálogo
        </Link>
      </Button>
    </div>
  );
}
