# Tasks 015 — Estado global con Zustand

Marco de cierre global: `npm run check` en verde.

- [x] **1. Agregar `zustand` a `tiendadcc-client`**
    RF: RNF-1 · Hecho cuando: aparece en `package.json` y el lockfile.
- [x] **2. Crear `stores/authStore.ts` con `useAuth()`**
    RF: RF-1, RF-4 · Hecho cuando: estado y acciones equivalen a `AuthContext`.
- [x] **3. Crear `stores/cartStore.ts` con `useCart()`**
    RF: RF-2, RF-4 · Hecho cuando: acciones usan `cartOperations` y los totales `cartCalculations`.
- [x] **4. Portar la sincronización a `logic/useCartSync.ts`**
    RF: RF-3 · Hecho cuando: los tres efectos de `CartProvider` viven en el hook.
- [x] **5. Crear `SessionSync` y `CartSync`; actualizar `App.tsx`**
    RF: RF-4 · Hecho cuando: `App.tsx` no tiene providers de estado.
- [x] **6. Migrar consumidores e imports (`context/` → `stores/`)**
    RF: RF-4 · Hecho cuando: no queda ningún import de `src/context/`.
- [x] **7. Reinicio de stores en `setupTests.ts` y migración de tests**
    RF: RF-1…RF-3 · Hecho cuando: los casos de `AuthContext`/`CartContext` pasan con los stores.
- [x] **8. Tests de acciones de los stores**
    RF: RF-1, RF-2, RNF-3 · Hecho cuando: `authStore.test.tsx` y `cartStore.test.ts` pasan.
- [x] **9. Eliminar `src/context/` y correr `npm run check`**
    RF: RF-4 · Hecho cuando: el directorio no existe y `npm run check` está en verde.
