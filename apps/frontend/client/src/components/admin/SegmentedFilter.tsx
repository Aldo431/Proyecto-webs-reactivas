import { Button } from "../ui/button.tsx";

type FilterValue = string | number | boolean | null;

interface SegmentedFilterProps<Value extends FilterValue> {
  /** Nombre del grupo para tecnologías de asistencia. */
  ariaLabel: string;
  options: ReadonlyArray<{ value: Value; label: string }>;
  value: Value;
  onChange: (value: Value) => void;
}

// Grupo de botones con `aria-pressed` (spec 013, RF-11, RF-13). El activo se
// distingue por relleno además de por color (spec 00, RF-9).
export function SegmentedFilter<Value extends FilterValue>({
  ariaLabel,
  options,
  value,
  onChange,
}: SegmentedFilterProps<Value>) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Button
            key={String(option.value)}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
