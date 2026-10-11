/*
 * Origen: shadcn/ui — utilidad `cn` (lib/utils).
 * URL: https://ui.shadcn.com/docs/installation/manual
 * Incorporado: 2026-10-03.
 * Cambios: escrito a mano con clsx + tailwind-merge en lugar del
 * `export { cn } from "cn"` que genera la CLI 4.x (paquete `cn` no
 * aprobado en specs/00-design-system/spec.md, RNF-6).
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
