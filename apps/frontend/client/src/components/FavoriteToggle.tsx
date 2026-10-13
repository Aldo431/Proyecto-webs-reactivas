import { Heart } from "lucide-react";
import { Button } from "./ui/button.tsx";

interface FavoriteToggleProps {
  productName: string;
  isFavorite: boolean;
  disabled: boolean;
  onToggle: () => void;
}

// Corazón con estado presionado: el relleno (no solo el color) distingue el
// activo, y el nombre accesible va en español (RF-10, RNF-4).
export function FavoriteToggle({
  productName,
  isFavorite,
  disabled,
  onToggle,
}: FavoriteToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? `Quitar ${productName} de favoritos`
          : `Agregar ${productName} a favoritos`
      }
      disabled={disabled}
      onClick={onToggle}
    >
      <Heart aria-hidden="true" fill={isFavorite ? "currentColor" : "none"} />
    </Button>
  );
}
