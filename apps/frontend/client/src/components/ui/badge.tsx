/*
 * Origen: shadcn/ui — componente `badge` (estilo new-york).
 * URL: https://ui.shadcn.com/docs/components/badge
 * Incorporado: 2026-10-04 (contenido de `npx shadcn@4.21.1 add badge --view`).
 * Cambios:
 * - Import de `cn` desde `@/lib/utils` en lugar del paquete `cn` (DS RNF-6).
 * - `destructive` usa `text-destructive-foreground` en vez de `text-white` y
 *   se quita `dark:bg-destructive/60`, porque `dark:` aplica siempre y
 *   rompería el contraste de DS RF-2.
 * - Anillo de foco con el token `ring` al 100 % (antes `ring/50`, 2,62:1 sobre
 *   `background`) y sin el anillo ámbar atenuado de `destructive`, para
 *   cumplir 3:1 (DS RF-2, RF-9; revisión T35).
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
