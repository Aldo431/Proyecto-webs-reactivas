/*
 * Origen: shadcn/ui — componente `textarea` (estilo new-york).
 * URL: https://ui.shadcn.com/docs/components/textarea
 * Incorporado: 2026-10-13 (contenido de `npx shadcn@4.21.1 add textarea --view`).
 * Cambios:
 * - Import de `cn` desde `@/lib/utils` en lugar del paquete `cn` (DS RNF-6).
 * - Anillo de foco con el token `ring` al 100 % (antes `ring/50`) y estado
 *   inválido solo con borde `destructive`, igual que `Input` (DS RF-2, RF-9).
 */
import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
