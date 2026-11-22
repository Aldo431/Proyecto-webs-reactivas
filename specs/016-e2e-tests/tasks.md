# Tasks 016 — Pruebas end-to-end con Playwright

Marco de cierre global: `npm run check` y `npm run e2e` en verde.

- [x] **1. Router `/api/testing` solo en modo test + test de backend**
    RF: RF-3 · Hecho cuando: `testingRoutes.test.ts` prueba el `204` y el vaciado.
- [x] **2. Servidor E2E con MongoDB en memoria (`start:e2e`)**
    RF: RF-2 · Hecho cuando: `npm run start:e2e -w backend` escucha en 3001 sin MongoDB instalado.
- [x] **3. Proyecto `e2etests/` con Playwright y configuración**
    RF: RF-1, RF-2 · Hecho cuando: `npx playwright test --list` encuentra los tests.
- [x] **4. Helpers y fixture de imagen**
    RF: RF-4…RF-6 · Hecho cuando: reinicio, registro, login y creación de productos son reutilizables.
- [x] **5. `auth.spec.ts`**
    RF: RF-4 · Hecho cuando: los 7 casos pasan.
- [x] **6. `products.spec.ts`**
    RF: RF-5 · Hecho cuando: crear, listar, editar y eliminar pasan.
- [x] **7. `cart.spec.ts`**
    RF: RF-6 · Hecho cuando: el carrito invitado sobrevive a login y recarga sin duplicar.
- [x] **8. READMEs y script raíz `e2e`**
    RF: RF-7 · Hecho cuando: un clon limpio puede seguir las instrucciones.
