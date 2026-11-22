# Plan 016 — Pruebas end-to-end con Playwright

## Estructura
| Archivo | Rol |
|---|---|
| `apps/backend/src/routes/testingRoutes.ts` | `POST /reset` (RF-3) |
| `apps/backend/src/app.ts` | Monta `/api/testing` solo si `nodeEnv === "test"` |
| `apps/backend/src/scripts/e2eServer.ts` | MongoDB en memoria (replica set) + `createApp()` (RF-2) |
| `apps/backend/package.json` | Script `start:e2e` |
| `e2etests/package.json` · `tsconfig.json` | Proyecto independiente (RF-1) |
| `e2etests/playwright.config.ts` | `baseURL`, `webServer` (backend + Vite), Chromium |
| `e2etests/tests/helpers.ts` | Reinicio, usuarios y productos de prueba |
| `e2etests/tests/auth.spec.ts` | RF-4 |
| `e2etests/tests/products.spec.ts` | RF-5 |
| `e2etests/tests/cart.spec.ts` | RF-6 |
| `e2etests/fixtures/producto.png` | Imagen para publicar |
| `e2etests/README.md`, `README.md` | RF-7 |

## Decisiones técnicas
- **D1 — MongoDB en memoria.** `mongodb-memory-server` ya es devDependency del
  backend: la suite no requiere MongoDB instalado y cada ejecución parte limpia.
  Se usa replica set porque los pedidos usan transacciones (spec 012/014).
- **D2 — `webServer` de Playwright.** A diferencia de la cátedra (donde el sistema
  debe estar corriendo), la suite levanta backend y frontend; con
  `reuseExistingServer: false` nunca reutiliza el backend de desarrollo.
- **D3 — Reinicio por API.** `POST /api/testing/reset` en `beforeEach`
  (patrón de la cátedra 09) y datos de prueba creados por API para los casos que
  no prueban el formulario (más rápidos y estables).
- **D4 — `page.request` para sesiones.** Comparte cookies con la página, así que
  un login por API deja al navegador autenticado.
- **D5 — `workers: 1`.** La base es compartida entre tests.
- **D6 — `reducedMotion: "reduce"`.** La app respeta `prefers-reduced-motion`,
  lo que evita esperas por animaciones.

## Estrategia
`auth.spec.ts` (7 casos), `products.spec.ts` (4 casos), `cart.spec.ts` (1 caso);
test de backend `testingRoutes.test.ts` para RF-3.
