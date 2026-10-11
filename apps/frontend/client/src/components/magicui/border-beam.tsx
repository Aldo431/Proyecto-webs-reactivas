/*
 * Origen: Magic UI — componente `border-beam`.
 * URL: https://magicui.design/r/border-beam
 * Incorporado: 2026-10-04 (contenido de `npx shadcn@4.21.1 add @magicui/border-beam --view`).
 * Cambios:
 * - Una sola pasada (`repeat: 0`) en vez de un bucle sin fin, con fundido de
 *   opacidad en el último 20 % del recorrido (DS RF-7; Home RF-2, RF-10).
 * - `delay` es un retardo positivo; el original lo usaba negativo para
 *   adelantar el bucle, lo que en una pasada única recortaría el recorrido.
 * - `aria-hidden="true"` en el contenedor: es decorativo (DS RF-10).
 * - Con movimiento reducido (`useReducedMotion()`) devuelve `null` (DS RF-8,
 *   plan D5).
 * - Colores por defecto con tokens (`--primary`, `--terminal-prompt`) en vez
 *   de hex (DS RF-1). El `#000` de la máscara solo define opacidad, no color.
 * - Componentes `m.*` en vez de `motion.*`, para cargar con `LazyMotion` +
 *   `domAnimation` solo las funciones que se usan (presupuesto de bundle,
 *   plan R6; revisión T36). Requiere `<LazyMotion>` en la raíz (App.tsx).
 */
import {
  m,
  useReducedMotion,
  type MotionStyle,
  type Transition,
} from "motion/react"

import { cn } from "@/lib/utils"

interface BorderBeamProps {
  /**
   * The size of the border beam.
   */
  size?: number
  /**
   * The duration of the single pass, in seconds.
   */
  duration?: number
  /**
   * The delay before the pass starts, in seconds.
   */
  delay?: number
  /**
   * The color of the border beam from.
   */
  colorFrom?: string
  /**
   * The color of the border beam to.
   */
  colorTo?: string
  /**
   * The motion transition of the border beam.
   */
  transition?: Transition
  /**
   * The class name of the border beam.
   */
  className?: string
  /**
   * The style of the border beam.
   */
  style?: React.CSSProperties
  /**
   * Whether to reverse the animation direction.
   */
  reverse?: boolean
  /**
   * The initial offset position (0-100).
   */
  initialOffset?: number
  /**
   * The border width of the beam.
   */
  borderWidth?: number
}

// Share of the pass after which the beam starts fading out.
const FADE_START = 0.8

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "var(--primary)",
  colorTo = "var(--terminal-prompt)",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) => {
  const shouldReduceMotion = useReducedMotion() === true
  if (shouldReduceMotion) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]"
      style={
        {
          "--border-beam-width": `${borderWidth}px`,
        } as React.CSSProperties
      }
    >
      <m.div
        className={cn(
          "absolute aspect-square",
          "bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent",
          className
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%`, opacity: 1 }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
          opacity: [1, 1, 0],
        }}
        transition={{
          repeat: 0,
          ease: "linear",
          duration,
          delay,
          ...transition,
          opacity: {
            ease: "linear",
            duration,
            delay,
            times: [0, FADE_START, 1],
          },
        }}
      />
    </div>
  )
}
