# Spec 015 — Estado global con Zustand

## Contexto y objetivo
El Hito 3 exige manejar el estado global con **Zustand o Redux Toolkit** e incluir
al menos dos stores/slices (p. ej. usuario y entidad principal). Hoy el estado
global vive en la Context API de React: `AuthContext` (sesión, specs 005/006) y
`CartContext` (carrito con sincronización contra la cuenta, specs 004, 006, 007,
008 y 014).

Esta spec reemplaza ambos contextos por **dos stores de Zustand** sin cambiar el
comportamiento observable: mismas vistas, mismas peticiones a la API, mismo
formato en `localStorage` y mismas reglas de fusión del carrito.

Lo que NO incluye: cambios de UI, nuevos datos en el estado global, persistencia
con el middleware `persist` de Zustand (se mantiene `logic/cartStorage.ts`) ni
Redux DevTools.

## Usuarios
- **Visitante y comprador**: no deben notar diferencia alguna.
- **Desarrollador/es**: acceden al estado con hooks y selectores, sin providers.

## Requisitos funcionales

**RF-1 — Store de sesión (`authStore`).**
El sistema deberá mantener la sesión del usuario en un store de Zustand con el
estado discriminado existente (`loading | anonymous | authenticated`) y las
acciones `refresh`, `login`, `register` y `logout`.
Criterios de aceptación:
- Cuando la aplicación se monte, el estado deberá partir en `loading` y pasar a
  `authenticated` o `anonymous` según `GET /api/auth/me` (sin cambios respecto de 005).
- Cuando `login` o `register` respondan éxito, el estado deberá quedar
  `authenticated` con el usuario recibido; ante fallo deberá conservarse el estado.
- Cuando se ejecute `logout`, deberá llamarse a `POST /api/auth/logout` y el
  estado deberá quedar `anonymous`.

**RF-2 — Store del carrito (`cartStore`), entidad principal.**
El sistema deberá mantener el carrito en un store de Zustand con `items`,
`isOpen`, `mergeNotice`, `syncError` y las acciones `addItem`, `updateQuantity`,
`removeItem`, `clearCart`, `openCart`, `closeCart`, `toggleCart` y
`dismissMergeNotice`.
Criterios de aceptación:
- Cuando la aplicación se cargue, el carrito deberá mostrarse de inmediato con lo
  guardado en `localStorage` (clave `cart`, formato sin cambios).
- Cuando se agreguen, modifiquen o quiten líneas, deberán aplicarse las funciones
  puras existentes de `logic/cartOperations.ts` (incluidas variantes y stock, 014).
- `totalCount` y `totalAmount` deberán derivarse de `items` con
  `logic/cartCalculations.ts`.

**RF-3 — Sincronización del carrito sin cambios de comportamiento.**
Cuando cambie la sesión o el carrito, el sistema deberá aplicar exactamente las
reglas de sincronización vigentes (006 RF-12/13, 008 RF-15): fusión solo en la
transición anónimo → autenticado, adopción sin PUT, convergencia silenciosa al
restaurar sesión, refresco contra la API al montar y error no bloqueante.
Criterios de aceptación:
- Los casos de `CartContext.test.tsx` deberán seguir pasando contra la nueva
  implementación, cambiando solo el montaje de prueba.

**RF-4 — API de consumo compatible.**
Los componentes deberán seguir usando `useAuth()` y `useCart()` con la misma
forma de retorno; ambos hooks deberán leer de los stores mediante selectores.
Criterios de aceptación:
- No deberá quedar ningún `createContext` para estado global ni providers de
  sesión o carrito en `App.tsx`.

## Requisitos no funcionales
- **RNF-1**: dependencia nueva `zustand` (^5) solo en `tiendadcc-client`.
- **RNF-2**: la lógica de negocio sigue en funciones puras (`logic/`); los stores
  solo orquestan estado (constitución, regla 3).
- **RNF-3**: cada store tiene tests propios de sus acciones (constitución, regla 4).
- **RNF-4**: TypeScript estricto, sin `any`.

## Casos límite
- Recarga con sesión válida y carrito idéntico al de la cuenta: sin PUT ni aviso.
- API de productos caída al montar o al iniciar sesión: no se descarta ni sube nada.
- Tests: al ser stores globales, deben reiniciarse entre casos.

## Fuera de alcance
Middleware `persist`/`devtools`, sincronización entre pestañas, nuevos stores.
