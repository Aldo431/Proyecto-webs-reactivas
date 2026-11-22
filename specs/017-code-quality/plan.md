# Plan 017 — Calidad de código

| Archivo | Cambio |
|---|---|
| `apps/backend/tsconfig.json` | Descomentar las 5 opciones (RF-1) |
| `eslint.config.mjs` | Configuración plana (RF-2) |
| `package.json` (raíz) | devDependencies y scripts `lint`, `lint:fix`, `check` (RF-3) |
| `README.md`, `docs/constitution.md` | Comandos y stack |

## Decisiones
- **D1 — ESLint en la raíz, no por workspace.** Una sola configuración para los
  cuatro proyectos (incluido `e2etests/`, que no es workspace) y un solo comando.
- **D2 — Sin información de tipos.** `tsc` ya verifica tipos en cada workspace;
  el linting tipado exigiría un `parserOptions.project` por paquete y no es
  compatible con el TypeScript 7 del backend.
- **D3 — `typescript` ~5.9 en la raíz.** Lo usa el parser de
  `typescript-eslint` (soporta `<6.1`). npm deja el TypeScript 7 del backend en
  `apps/backend/node_modules`, de modo que `npm run check -w backend` sigue
  usando TS 7.
- **D4 — Solo `rules-of-hooks` y `exhaustive-deps`.** Las reglas del React
  Compiler del preset `recommended` de `eslint-plugin-react-hooks` 7 quedan
  fuera de alcance (cambiarían componentes que ya cumplen las specs).

## Hallazgos corregidos al activar las reglas
- Backend: import de tipo sin uso en `usersRoutes.test.ts`.
- Frontend: asignaciones iniciales inútiles (`no-useless-assignment`) en
  `cartStorage.ts`, `useCartSync.test.tsx` y `ProfilePage.test.tsx`, y dos
  `eslint-disable` sin efecto en `ProfilePage.tsx`.
