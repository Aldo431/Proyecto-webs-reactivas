/*
 * Origen: shadcn/ui — componente `label` (estilo new-york).
 * URL: https://ui.shadcn.com/docs/components/label
 * Incorporado: 2026-10-12 (contenido de `npx shadcn@4.21.1 add label --view`).
 * Cambios:
 * - Import de `cn` desde `@/lib/utils` en lugar del paquete `cn` (DS RNF-6).
 * - Import desde el paquete unificado `radix-ui` en vez de
 *   `@radix-ui/react-label`, ya sancionado en el DS RNF-6.
 */
import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
