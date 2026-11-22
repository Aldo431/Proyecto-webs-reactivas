# Plan 015 — Estado global con Zustand

## Estructura de módulos
| Archivo | Rol |
|---|---|
| `src/stores/authStore.ts` | Store `useAuthStore` (estado `AuthState` + acciones) y hook `useAuth()` |
| `src/stores/cartStore.ts` | Store `useCartStore` (items, drawer, avisos + acciones) y hook `useCart()` |
| `src/logic/useCartSync.ts` | Efectos de sincronización del carrito (antes en `CartProvider`) |
| `src/components/SessionSync.tsx` | Restaura la sesión al montar (`refresh()` una vez) |
| `src/components/CartSync.tsx` | Monta `useCartSync()` |
| `src/test/storeReset.ts` | `resetStores()` para tests (estado inicial + relectura de `localStorage`) |

`App.tsx` pasa de `<AuthProvider><CartProvider>…` a montar `<SessionSync />` y
`<CartSync />` una vez. Ambos aceptan `children` opcionales para que los tests
conserven su estructura actual de montaje.

## Decisiones técnicas
- **D1 — Zustand en vez de Redux Toolkit.** Permite conservar `useAuth()`/`useCart()`
  con la misma firma (25 consumidores sin cambios) y no requiere `Provider`.
  Las acciones asíncronas son funciones normales (sin thunks). Descartado RTK por
  mayor boilerplate y por obligar a reescribir la lógica asíncrona.
- **D2 — Efectos de sincronización fuera del store.** La sincronización depende
  de transiciones de sesión y de no subir cambios provenientes de la propia
  sincronización (`skipPersistRef`). Se porta casi literal a `useCartSync()` para
  no alterar reglas ya probadas; el store solo expone setters internos
  (`setItems`, `setMergeNotice`, `setSyncError`).
- **D3 — Persistencia con `logic/cartStorage.ts`.** No se usa `persist` para no
  cambiar el formato guardado ni el fallback en memoria.
- **D4 — Selectores con `useShallow`.** `useAuth()`/`useCart()` seleccionan varios
  campos sin renders extra; los derivados se memorizan.
- **D5 — Reinicio en tests.** `setupTests.ts` llama a `resetStores()` antes de cada
  test; los tests que siembran `localStorage` vuelven a hidratar con
  `resetCartStore()` antes de montar.

## Estrategia de tests
- `authStore.test.tsx`: casos actuales de `AuthContext.test.tsx` (montaje con
  `SessionSync`) + acciones del store sin React.
- `cartStore.test.ts`: acciones puras del store (agregar, cantidad, quitar,
  vaciar, drawer, aviso, totales).
- `useCartSync.test.tsx`: los 13 casos actuales de `CartContext.test.tsx`.
- Tests de páginas/componentes: reemplazo de providers por `SessionSync`/`CartSync`.

## Cobertura de RF
RF-1 → authStore.test; RF-2 → cartStore.test; RF-3 → useCartSync.test + E2E 016
(carrito); RF-4 → `tsc` + búsqueda de `createContext`.
