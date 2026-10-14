import { SORT_OPTIONS, type SortOrder } from "../logic/catalogQuery.ts";
import { Label } from "./ui/label.tsx";

interface CatalogSortSelectProps {
  value: SortOrder;
  onChange: (orden: SortOrder) => void;
}

function isSortOrder(value: string): value is SortOrder {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export function CatalogSortSelect({ value, onChange }: CatalogSortSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="catalog-sort">Ordenar por</Label>
      <select
        id="catalog-sort"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          onChange(isSortOrder(next) ? next : "recientes");
        }}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
