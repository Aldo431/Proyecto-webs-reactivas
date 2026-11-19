import type { AdminOverview } from "@tiendadcc/utils";
import { categoryBars } from "../../logic/adminFormat.ts";

interface CategoryBarsProps {
  byCategory: AdminOverview["products"]["byCategory"];
}

// Barras horizontales proporcionales al máximo (spec 013, RF-10). El gráfico
// completo es una sola imagen con todos los valores en su `aria-label`; las
// barras no transmiten nada que el número de la derecha no diga.
export function CategoryBars({ byCategory }: CategoryBarsProps) {
  const { bars, ariaLabel } = categoryBars(byCategory);
  return (
    <div role="img" aria-label={ariaLabel} className="flex flex-col gap-3">
      {bars.map((bar) => (
        <div key={bar.category} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 text-muted-foreground">
            {bar.category}
          </span>
          <span className="h-2 min-w-0 flex-1 rounded-full bg-secondary">
            <span
              data-testid={`bar-${bar.category}`}
              className="block h-full rounded-full bg-primary"
              style={{ width: `${bar.widthPercent}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right font-mono">{bar.count}</span>
        </div>
      ))}
    </div>
  );
}
