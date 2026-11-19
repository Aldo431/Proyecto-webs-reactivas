import { cn } from "@/lib/utils";
import type { StatCardData } from "../../logic/adminFormat.ts";
import { Card } from "../ui/card.tsx";

// Indicador del Resumen (spec 013, RF-10). Es un elemento de lista de
// definición: la etiqueta es el término y la cifra y la nota, su definición.
export function StatCard({ label, value, note, highlightNote }: StatCardData) {
  return (
    <Card className="min-w-0 gap-1 p-4 shadow-none">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-3xl font-bold text-foreground">{value}</dd>
      <dd
        className={cn(
          "font-mono text-xs",
          highlightNote ? "text-terminal-success" : "text-muted-foreground",
        )}
      >
        {note}
      </dd>
    </Card>
  );
}
