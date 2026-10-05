/*
 * Origen: Magic UI — componente `blur-fade`.
 * URL: https://magicui.design/r/blur-fade
 * Incorporado: 2026-10-04 (contenido de `npx shadcn@4.21.1 add @magicui/blur-fade --view`).
 * Cambios:
 * - Eliminada la directiva `"use client"` (DS RF-12).
 * - Movimiento reducido (DS RF-8, plan D5) con `useReducedMotion()`: se
 *   renderiza directamente en el estado `visible` (`initial={false}`), sin
 *   desenfoque ni desplazamiento.
 * - Componentes `m.*` en vez de `motion.*`, para cargar con `LazyMotion` +
 *   `domAnimation` solo las funciones que se usan (presupuesto de bundle,
 *   plan R6; revisión T36). Requiere `<LazyMotion>` en la raíz (App.tsx).
 */
import { useRef } from "react"
import {
  AnimatePresence,
  m,
  useInView,
  useReducedMotion,
  type MotionProps,
  type UseInViewOptions,
  type Variants,
} from "motion/react"

type MarginType = UseInViewOptions["margin"]

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode
  className?: string
  variant?: {
    hidden: { y: number }
    visible: { y: number }
  }
  duration?: number
  delay?: number
  offset?: number
  direction?: "up" | "down" | "left" | "right"
  inView?: boolean
  inViewMargin?: MarginType
  blur?: string
}

const getFilter = (v: Variants[string]) =>
  typeof v === "function" ? undefined : v.filter

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = "down",
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
  ...props
}: BlurFadeProps) {
  const ref = useRef(null)
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin })
  const shouldReduceMotion = useReducedMotion() === true
  const isInView = shouldReduceMotion || !inView || inViewResult
  const defaultVariants: Variants = {
    hidden: {
      [direction === "left" || direction === "right" ? "x" : "y"]:
        direction === "right" || direction === "down" ? -offset : offset,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      [direction === "left" || direction === "right" ? "x" : "y"]: 0,
      opacity: 1,
      filter: `blur(0px)`,
    },
  }
  const combinedVariants = variant ?? defaultVariants

  const hiddenFilter = getFilter(combinedVariants.hidden)
  const visibleFilter = getFilter(combinedVariants.visible)

  const shouldTransitionFilter =
    hiddenFilter != null &&
    visibleFilter != null &&
    hiddenFilter !== visibleFilter

  return (
    <AnimatePresence>
      <m.div
        ref={ref}
        initial={shouldReduceMotion ? false : "hidden"}
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: "easeOut",
          ...(shouldTransitionFilter ? { filter: { duration } } : {}),
        }}
        className={className}
        {...props}
      >
        {children}
      </m.div>
    </AnimatePresence>
  )
}
