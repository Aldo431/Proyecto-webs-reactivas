import { useEffect, useState } from "react";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";

interface CatalogPriceFilterProps {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

function parsePriceText(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

function toText(value: number | null): string {
  return value === null ? "" : String(value);
}

export function CatalogPriceFilter({ min, max, onChange }: CatalogPriceFilterProps) {
  const [minText, setMinText] = useState<string>(() => toText(min));
  const [maxText, setMaxText] = useState<string>(() => toText(max));

  useEffect(() => {
    setMinText(toText(min));
  }, [min]);
  useEffect(() => {
    setMaxText(toText(max));
  }, [max]);

  function handleMinChange(text: string): void {
    setMinText(text);
    const parsed = parsePriceText(text);
    if (parsed !== undefined) {
      onChange(parsed, max);
    }
  }

  function handleMaxChange(text: string): void {
    setMaxText(text);
    const parsed = parsePriceText(text);
    if (parsed !== undefined) {
      onChange(min, parsed);
    }
  }

  return (
    <div className="flex gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor="catalog-min-price">Precio mínimo</Label>
        <Input
          id="catalog-min-price"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Mínimo"
          value={minText}
          onChange={(event) => handleMinChange(event.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor="catalog-max-price">Precio máximo</Label>
        <Input
          id="catalog-max-price"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Máximo"
          value={maxText}
          onChange={(event) => handleMaxChange(event.target.value)}
        />
      </div>
    </div>
  );
}
