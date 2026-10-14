import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";

interface CatalogSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function CatalogSearchBar({ value, onChange }: CatalogSearchBarProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label htmlFor="catalog-search">Buscar por nombre</Label>
      <Input
        id="catalog-search"
        role="searchbox"
        type="search"
        autoComplete="off"
        placeholder="Buscar por nombre"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
