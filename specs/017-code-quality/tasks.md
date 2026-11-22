# Tasks 017 — Calidad de código

Marco de cierre global: `npm run check` en verde.

- [x] **1. Activar las opciones estrictas del backend**
    RF: RF-1 · Hecho cuando: `tsc --noEmit` del backend pasa.
- [x] **2. Instalar ESLint y crear `eslint.config.mjs`**
    RF: RF-2, RNF-1 · Hecho cuando: `npx eslint .` corre en todo el repositorio.
- [x] **3. Corregir los hallazgos**
    RF: RF-2 · Hecho cuando: `npm run lint` termina sin errores ni advertencias.
- [x] **4. Scripts y documentación**
    RF: RF-3 · Hecho cuando: `npm run check` ejecuta ESLint y el README lo documenta.
