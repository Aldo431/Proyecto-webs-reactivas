/*
 * Origen: shadcn/ui — componente `input` (estilo new-york).
 * URL: https://ui.shadcn.com/docs/components/input
 * Incorporado: 2026-10-12 (contenido de `npx shadcn@4.21.1 add input --view`).
 * Cambios:
 * - Import de `cn` desde `@/lib/utils` en lugar del paquete `cn` (DS RNF-6).
 * - Anillo de foco con el token `ring` al 100 % (antes `ring/50`), para
 *   cumplir el contraste 3:1 (DS RF-2, RF-9).
 * - El estado inválido solo cambia el borde a `destructive`, sin el anillo
 *   ámbar atenuado; el color nunca es la única señal (DS RF-2, RNF-4).
 */
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
