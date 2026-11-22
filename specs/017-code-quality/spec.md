# Spec 017 — Calidad de código: ESLint y TypeScript estricto en el backend

## Contexto y objetivo
El Hito 3 exige "TypeScript estricto, sin any injustificado". El proyecto ya
compila con `strict`, pero (a) el backend tenía comentadas las opciones
`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
`noImplicitOverride` y `noFallthroughCasesInSwitch`, y (b) no había ningún
linter, así que la regla "sin `any`" dependía de revisiones manuales y los
comentarios `eslint-disable` existentes no tenían efecto. Los laboratorios del
curso (Lab 7) usan ESLint con `typescript-eslint`.

Esta spec activa esas opciones en el backend y agrega ESLint al monorepo,
integrado en `npm run check`.

Fuera de alcance: linting con información de tipos (`recommendedTypeChecked`),
reglas de estilo/formato (Prettier) y las reglas del React Compiler de
`eslint-plugin-react-hooks`.

## Requisitos funcionales

**RF-1 — TypeScript estricto completo en el backend.**
`apps/backend/tsconfig.json` deberá activar `noUnusedLocals`,
`noUnusedParameters`, `noImplicitReturns`, `noImplicitOverride` y
`noFallthroughCasesInSwitch`, y `tsc --noEmit` deberá pasar.

**RF-2 — ESLint en todo el repositorio.**
Deberá existir `eslint.config.mjs` en la raíz que revise los `.ts`/`.tsx` de
`apps/frontend/client`, `apps/backend`, `utils` y `e2etests` con
`@eslint/js` + `typescript-eslint` (recomendadas).
Criterios de aceptación:
- `@typescript-eslint/no-explicit-any` es error.
- Variables y parámetros sin uso son error, salvo los prefijados con `_`.
- En el frontend, `react-hooks/rules-of-hooks` y `react-hooks/exhaustive-deps`
  son error; un `eslint-disable` que no suprime nada se reporta.

**RF-3 — Integración en el flujo.**
`npm run lint` ejecuta ESLint, `npm run lint:fix` corrige lo automático y
`npm run check` ejecuta ESLint antes de tipos y tests.

## Requisitos no funcionales
- **RNF-1**: dependencias nuevas en la raíz (devDependencies): `eslint`,
  `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals` y
  `typescript` ~5.9 (para el parser de `typescript-eslint`, que no soporta el
  TypeScript 7 del backend; el backend sigue compilando con su propio TS 7).
- **RNF-2**: `npm run lint` termina en menos de 30 s en un equipo de desarrollo.
