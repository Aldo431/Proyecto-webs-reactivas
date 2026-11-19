import { cn } from "@/lib/utils";

interface FeaturedSwitchProps {
  checked: boolean;
  /** Mientras responde la API el interruptor queda deshabilitado (RF-11). */
  disabled: boolean;
  /** Nombre accesible, p. ej. «Destacar «Taza DCC»». */
  label: string;
  onToggle: () => void;
}

// Interruptor accesible hecho con `<button role="switch">`, sin dependencias
// (spec 013, RNF-2). El estado se ve por la posición de la perilla además de
// por el color (spec 00, RNF-4); la transición la anula la regla global de
// movimiento reducido.
export function FeaturedSwitch({
  checked,
  disabled,
  label,
  onToggle,
}: FeaturedSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary bg-primary" : "border-input bg-secondary",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block size-4 rounded-full transition-transform",
          checked
            ? "translate-x-6 bg-primary-foreground"
            : "translate-x-1 bg-foreground",
        )}
      />
    </button>
  );
}
