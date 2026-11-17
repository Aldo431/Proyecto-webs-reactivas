import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "../ui/card.tsx";

interface AdminCardSectionProps {
  title: string;
  /** Enlace u otra acción a la derecha del título. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

// Tarjeta de una sección del panel (bg-card, border, rounded-xl) con su
// título. `min-w-0` evita que una tabla ancha estire la grilla: el
// desplazamiento ocurre dentro de la tarjeta, no en la página (RNF-6).
export function AdminCardSection({
  title,
  action,
  className,
  children,
}: AdminCardSectionProps) {
  return (
    <Card className={cn("min-w-0 gap-4 p-4 shadow-none", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}
