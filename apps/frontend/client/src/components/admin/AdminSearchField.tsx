import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";

interface AdminSearchFieldProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

// Campo de búsqueda con `label` "Buscar" (spec 013, RF-11, RF-12).
export function AdminSearchField({
  id,
  placeholder,
  value,
  onChange,
}: AdminSearchFieldProps) {
  return (
    <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5">
      <Label htmlFor={id}>Buscar</Label>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
