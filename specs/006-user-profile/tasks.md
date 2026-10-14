# Tasks 006 — Perfil de usuario

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario del perfil, carrito y backend existentes**
    RF: RF-1…RF-13 (base para todo)
    Hecho cuando: conozco `models/User.ts` (solo `name`/`email`/`passwordHash`), `routes/authRoutes.ts` + `authController.ts` (sin nada de perfil), `requireAuth` y `errorHandler` (mapeos `400`/`401`/`409`/`503` ya existentes), `CartContext.tsx` + `cartStorage.ts` (carrito solo en `localStorage` clave `cart`), `AuthContext.tsx` (con `refresh` y montado sobre `CartProvider`), `authApi.ts` (patrón `AuthResult`), `ProductDetailPage.tsx`, `CartDrawer.tsx`, `App.tsx` (HashRouter) y el plan de dónde aterriza cada módulo nuevo.

## Fase 1 — Esquemas compartidos (depende de 1)

- [x] **2. Esquemas Zod de perfil en `utils/` (`profileSchemas.ts`)**
    RF: RF-3, RF-4, RF-5, RF-6, RF-11
    Hecho cuando: defino `updateProfileSchema` (`name` 1–80 con `trim`, `email` válido con `trim`, `currentPassword` mínimo 1 carácter), `favoriteInputSchema`/`historyInputSchema` (`productId` no vacío con `trim`), `cartLineSchema`/`cartSchema` (`quantity` entero positivo), `profileSchema` (sin `passwordHash`) y `MAX_PROD_HISTORY = 67`, los exporto en `index.ts` con sus tipos, y sus tests unitarios (válido, `trim`, email inválido, cantidad 0/negativa, valor de la constante, mensajes en español) pasan.

## Fase 2 — Backend: modelo, servicio y rutas (depende de 2)

- [x] **3. Extender el modelo `User` con `toProfileJSON()`**
    RF: RF-1, RF-2
    Hecho cuando: `models/User.ts` agrega `favorites`, `history` (`{ productId, viewedAt }`), `cart` (`{ productId, quantity }`) y `emailVerified` (todos con valor por defecto), `toProfileJSON()` devuelve el perfil sin `passwordHash` ni `__v` normalizando documentos legacy a `[]`/`false`, y conservo `toPublicJSON()` intacto para `/api/auth/*`.

- [x] **4. Servicio de perfil (`profileService.ts`)**
    RF: RF-1, RF-3, RF-4, RF-5, RF-11
    Hecho cuando: implemento `updateProfileData` (verifica `currentPassword` con `verifyPassword`, normaliza el email a minúsculas, propaga duplicados como `ConflictError`), `addFavorite` con `$addToSet` (unicidad atómica por `productId`) / `removeFavorite` idempotente con `$pull`, `recordVisit` (mueve al frente, sin duplicados, recorta a `MAX_PROD_HISTORY` importado de `@tiendadcc/utils`) y `replaceCart`, y sus tests con `mongodb-memory-server` pasan.

- [x] **5. Rutas y controlador `/api/users`**
    RF: RF-2, RF-3, RF-4, RF-5, RF-11
    Hecho cuando: `routes/usersRoutes.ts` + `controllers/usersController.ts` exponen `GET /me`, `PUT /me`, `POST /me/favorites`, `DELETE /me/favorites/:productId`, `POST /me/history` y `PUT /me/cart` tras `requireAuth`, revalidan con `@tiendadcc/utils`, `PUT /me` ignora `favorites`/`history`/`cart`/`emailVerified`/`isAdmin`, la contraseña incorrecta responde `401` en español, monto `/api/users` en `app.ts`, y `npm run check -w backend` compila.

- [x] **6. Tests de rutas de perfil y carrito**
    RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-11
    Hecho cuando: con Vitest + supertest + `mongodb-memory-server` verifico `GET /me` (`200` con perfil completo y `cart`, `401` sin cookie, documento legacy con `[]`/`false`), `PUT /me` (`200` persistido y normalizado, `401` sin cambios con contraseña incorrecta, `400` inválido, `409` con correo ajeno en distinto caso, extras ignorados, sin `passwordHash` en ninguna respuesta), favoritos (agregar, duplicado sin duplicar incluso con altas concurrentes, `400`, eliminar existente/inexistente idempotentes), historial (reorden sin duplicados, recorte a 67) y `PUT /cart` (válido, `400` sin cambios, `[]` que vacía), y todos pasan.

## Fase 3 — Frontend: lógica pura (depende de 2)

- [x] **7. Cliente de API del perfil (`profileApi.ts`)**
    RF: RF-8, RF-9, RF-10, RF-11
    Hecho cuando: implemento `fetchProfile`, `updateProfile`, `addFavorite`, `removeFavorite`, `recordVisit` y `replaceCart` con `credentials: "include"`, valido las respuestas con `profileSchema`, traduzco `400`→errores por campo y `401`/`409`→mensaje en español, nunca envío `favorites`/`history`/`cart` en el `PUT /me`, y sus tests con `fetch` simulado pasan.

- [x] **8. Fusión del carrito (`cartSync.ts`) y paginación del historial (`profilePagination.ts`)**
    RF: RF-8, RF-12
    Hecho cuando: `mergeCarts` suma cantidades por `productId`, descarta ids inexistentes tomando `name`/`price`/`image` del catálogo e indica fusión real solo si ambos lados eran no vacíos, `paginate` recorta páginas de `HISTORY_PAGE_SIZE = 10` con `totalPages` correcto, y sus tests unitarios (suma, descarte, catálogo actualizado, ambos vacíos, bordes de página) pasan.

## Fase 4 — Frontend: estado y UI (depende de 5, 7, 8)

- [ ] **9. Sincronización del carrito en `CartContext` con fusión por delta y huella**
    RF: RF-12, RF-13
    Hecho cuando: solo fusiono en la transición anónimo→autenticado sumando el delta sobre la huella `cart-synced:<id>` (la restauración de sesión nunca fusiona: con local vacío adopta, con local igual a la huella mantiene, con cambios no sincronizados converge en silencio), la huella se actualiza solo ante escritura exitosa y sobrevive al logout, la adopción nunca envía `PUT` vacío, cada cambio con sesión persiste sin bloquear (error no bloqueante, local como autoridad, reintento al próximo cambio), el logout no altera ningún carrito, el anónimo no genera red, `CartDrawer` muestra el aviso en región `role="status"` descartable, y sus tests con `fetch` simulado (fusión con aviso, adopción, recarga idéntica sin `PUT`/aviso/duplicación, re-login sin duplicar, delta post-logout, fallo con reintento, cierre sin cambios) pasan.

- [x] **10. `FavoriteToggle` e integración en el detalle**
    RF: RF-10
    Hecho cuando: `FavoriteToggle.tsx` expone botón corazón con `aria-pressed` y nombre accesible en español, `ProductDetailPage.tsx` lo muestra junto a "Agregar al carrito" (autenticado: persiste y refleja al instante con error en español si falla; anónimo: navega a `/iniciar-sesion`), la visita se registra solo con sesión y producto existente sin bloquear el render, y sus smoke tests pasan.

- [x] **11. `ProfilePage` en lectura y edición**
    RF: RF-8, RF-9
    Hecho cuando: el modo lectura muestra datos, estado de cuenta (texto, nunca solo color), favoritos e historial paginado resueltos contra el catálogo (vacíos con "Explorar catálogo" a `#/catalogo`), resumen "Mi carrito" que abre el drawer, botón "Editar perfil" y estados de carga/error con "Reintentar"; el modo edición parte de los valores actuales, exige "Contraseña actual" con `TextField`, valida en español sin enviar si hay errores, bloquea el doble envío, mueve el foco al error, ante `200` muestra éxito, vuelve a lectura y llama `refresh()`, ante `400`/`401`/`409` muestra el mensaje sin perder datos, "Cancelar" no envía nada, y sus smoke tests pasan.

- [x] **12. Ruta `/perfil` protegida en `App.tsx`**
    RF: RF-7
    Hecho cuando: agrego la guarda `OnlyAuthenticatedRoute` (autenticado → `ProfilePage`, anónimo → `/iniciar-sesion`, neutro durante `loading`) con ruta `#/perfil`, y sus tests de navegación pasan.

- [x] **13. Actualizar los tests existentes afectados**
    RF: RF-7, RF-10
    Hecho cuando: actualizo `App.test.tsx` y los tests que rendericen el detalle/header/drawer a la nueva UI (guarda de perfil, `FavoriteToggle`, aviso del drawer) sin eliminar aserciones que sigan vigentes, y pasan.

## Fase 5 — Accesos de encabezado, verificación y cierre (depende de 6, 12, 13)

- [ ] **14. Accesos de Favoritos y Perfil en el encabezado**
    RF: RF-14
    Hecho cuando: `Header` muestra Favoritos (corazón) y Perfil (persona) funcionales sin `ComingSoonItem` con el mismo estilo fantasma, autenticado navega a `/perfil` (Favoritos con `state: { section: "favoritos" }` y la sección recibe desplazamiento y foco manteniendo `#/perfil`), anónimo es redirigido a `/iniciar-sesion`, y sus smoke tests (ambos estados, navegación a sección y a login) pasan.

- [ ] **15. Verificación QA según criterios de finalización 1–12 y 14, accesibilidad y responsividad**
    RF: RF-1…RF-14, RNF-1…RNF-9
    Hecho cuando: verifico manualmente contra backend real con MongoDB el perfil (lectura, edición correcta/incorrecta/duplicada, cancelar), favoritos (detalle y perfil, persistencia tras recarga, anónimo a login), historial (>10 visitas con paginación, la 68ª descarta la más antigua), carrito (fusión con aviso en el drawer, recarga y re-login sin duplicar, delta post-logout, adopción sin vaciar verificada en DB, persistencia entre navegadores tras login, logout intacto, anónimo sin red), encabezado (Favoritos lleva a la sección con foco, Perfil a `/perfil`, anónimo a login, sin "Próximamente"), y compruebo teclado, foco visible, `aria-pressed`/`role="status"`/`role="alert"`, textos en español y 360 px sin desplazamiento horizontal.

- [ ] **16. Cierre: `npm run check` en verde**
    RF: RNF-9, criterio de finalización 15
    Hecho cuando: `npm run check` (tipos de `utils`, backend y frontend + tests) pasa sin errores y anoto el resultado en la respuesta final.
