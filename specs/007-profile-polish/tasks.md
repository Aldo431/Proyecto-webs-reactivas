# Tasks 007 — Pulido del perfil y la navegación

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario del delta sobre 004–006**
    RF: RF-1…RF-9 (base para todo)
    Hecho cuando: conozco `models/User.ts` y `toPublicJSON()`/`toProfileJSON()` (006), `authService.createUser` y `profileService.updateProfileData` (único `409` de correo), `usersController.ts` (lista de campos ignorados en `PUT /me`), `errorHandler.ts` (11000 con mensaje de correo), `RegisterPage.tsx` (`FIELD_ORDER`, cuatro campos), `ProfilePage.tsx` (lectura/edición, favoritas como enlaces, historial paginado), `ProductCard.tsx` (botón textual "Agregar"), `ProductDetailPage.tsx` (toggle solo ícono), `Header.tsx` (Favoritos/Perfil de 006/RF-14, `showBackButton`) y `AuthBar.tsx` (muestra `name`), y el plan de dónde aterriza cada cambio sin tocar la 006.

## Fase 1 — Esquemas y backend: identidad (depende de 1)

- [ ] **2. Esquemas de identidad en `utils/`**
    RF: RF-1, RF-2
    Hecho cuando: `authSchemas.ts` suma `usernameField` (`trim`, minúsculas, 1–80) y `displayName` a `registerInputSchema` y ambos a `publicUserSchema` (login sin cambios), `profileSchemas.ts` pasa `updateProfileSchema` a `{ username, displayName, email, currentPassword }` y suma ambos a `profileSchema`, y sus tests (normalización, límites, `displayName` duplicado válido en esquema, mensajes en español) pasan.

- [ ] **3. Modelo `User` con `username` único y adopción legacy**
    RF: RF-1
    Hecho cuando: `models/User.ts` agrega `username` (`unique`, `lowercase`, `trim`, requerido) y `displayName` (requerido, 1–80), ambos incluidos en `toPublicJSON()`/`toProfileJSON()` con adopción de `name` en documentos legacy, y `npm run check -w backend` compila.

- [ ] **4. Servicios y `409` por campo**
    RF: RF-1
    Hecho cuando: `createUser` responde `409` ante `username` duplicado insensible a caso, `updateProfileData` acepta `username`/`displayName` con `currentPassword` y responde `409` ante `username` ajeno (propio conservado sin error), el `errorHandler` distingue `keyValue.username` de `keyValue.email` en el 11000, y sus tests con `mongodb-memory-server` pasan.

- [ ] **5. Tests de rutas de identidad**
    RF: RF-1, RF-2
    Hecho cuando: con supertest verifico registro `201` con ambos campos, `409` de `username` en distinto caso y de correo, `displayName` duplicado → `201`, concurrencia al mismo `username` (un `201` y un `409`), `PUT /me` que cambia `username` con contraseña correcta y `409` ante ajeno sin cambios, contratos con ambos campos sin `passwordHash`, legacy que adopta `name` en ambos, y todos pasan.

## Fase 2 — Frontend: identidad y encabezado (depende de 2, 4)

- [ ] **6. `RegisterPage` con ambos campos**
    RF: RF-2
    Hecho cuando: el formulario suma "Nombre de usuario" y "Nombre a mostrar" controlados (orden de foco y `FIELD_ORDER` actualizados), valida con el esquema extendido, muestra el `409` de `username`/correo sin perder datos y navega a `/` al registrar, y sus tests pasan.

- [ ] **7. `ProfilePage` con `username` editable**
    RF: RF-1
    Hecho cuando: la lectura muestra `username`, `displayName`, correo y estado; la edición suma el campo `username` pre-rellenado con validación, foco y `409` en español sin perder datos; el éxito refleja ambos y llama `refresh()`; y sus smoke tests pasan.

- [ ] **8. Botón `[DisplayName]`, burger y fuera "Volver"**
    RF: RF-3, RF-4, RF-5
    Hecho cuando: `Header` muestra el botón `[DisplayName]` (nombre accesible "Mi perfil", → `/perfil`) con sesión y "Perfil" → login sin ella, elimino `showBackButton`/`backLabel` y el botón "Volver" de las seis vistas, bajo `sm` hay hamburguesa con Catálogo/Favoritos/cuenta (logo y carrito siempre visibles, `aria-expanded`, cierre con selección/`Escape` y retorno de foco) y nav completo desde `sm`, `AuthBar` muestra `displayName`, y sus smoke tests (ambos estados, burger, sin "Volver") pasan.

## Fase 3 — Frontend: tarjetas e historial (depende de 2, 8)

- [ ] **9. Acciones dentro de `ProductCard` y favorito textual en detalle**
    RF: RF-6, RF-7
    Hecho cuando: la tarjeta muestra sobre la imagen el contenedor con fondo de superficie y los íconos de carrito y corazón (nombres accesibles preservados, `aria-pressed` y relleno activo, anónimo → login, sin navegar ni anidar interactivos, sin botón textual), el detalle muestra "Agregar/Quitar de favoritos" con corazón alineado al carrito, y sus smoke tests (incluido táctil sin `hover` y redirect anónimo) pasan.

- [ ] **10. Favoritas como mini-tarjetas e historial en carrusel**
    RF: RF-8, RF-9
    Hecho cuando: `FavoriteProductCard.tsx` muestra imagen, nombre, precio CLP y enlace (con "Eliminar" de papelera+texto solo en favoritas), el perfil las pagina de 12 en grilla 1→2→3 con "Página X de Y", el historial es carrusel horizontal con fecha es-CL y "Cargar anteriores" por lotes de 10 hasta agotar, los vacíos e inexistentes se comportan según 006, y sus smoke tests pasan.

## Fase 4 — Integración y cierre (depende de 5, 10)

- [ ] **11. Actualizar los tests existentes afectados**
    RF: RF-1…RF-9
    Hecho cuando: actualizo `App.test.tsx`, `ProductGrid`, `CatalogPage`, `RegisterPage`, `Header`, detalle, perfil y `HomePage` (botón textual, enlaces de favoritas, paginación de historial, `showBackButton`, `name` en `AuthBar`) sin eliminar aserciones vigentes, y pasan.

- [ ] **12. Verificación QA según criterios de finalización 1–9, accesibilidad y responsividad**
    RF: RF-1…RF-9, RNF-1…RNF-8
    Hecho cuando: verifico manualmente contra backend real el registro y edición de identidad (duplicados, `409`, legacy que adopta), `[DisplayName]` y burger en 360 px (navegación, `Escape`, foco), tarjetas (íconos legibles, anónimo a login, táctil), favoritas (grilla, 13 items en 2 páginas, eliminar), historial (carrusel, fecha en español, cargas hasta agotar), ausencia de "Volver" en todas las vistas, teclado, foco y textos en español.

- [ ] **13. Cierre: `npm run check` en verde**
    RF: RNF-8, criterio de finalización 12
    Hecho cuando: `npm run check` (tipos de `utils`, backend y frontend + tests) pasa sin errores y anoto el resultado en la respuesta final.
