# Plan 006 — Perfil de usuario

Plan de implementación para la spec `006-user-profile`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-13. Cada sección indica qué RF atiende.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13.*

Se trabaja sobre lo ya construido: workspace `utils/` con `@tiendadcc/utils` (005), backend Express con `requireAuth` y `errorHandler` centralizado, `AuthContext` con estado discriminado y `CartProvider` montado dentro de `AuthProvider` en `App.tsx`. La lógica de negocio vive en servicios del backend y en funciones puras del frontend, nunca en los componentes (§3).

- **Esquemas compartidos** — `utils/src/` *(RF-3, RF-4, RF-5, RF-6, RF-11)*
  - `profileSchemas.ts` (nuevo): `updateProfileSchema` = `{ name, email, currentPassword }` (name 1–80 con `trim`, email válido con `trim`, `currentPassword` mínimo 1 carácter, mensajes en español); `favoriteInputSchema` / `historyInputSchema` = `{ productId }` no vacío con `trim`; `cartLineSchema` = `{ productId, quantity }` (`quantity` entero positivo) y `cartSchema` como arreglo; `profileSchema` = `{ id, name, email, emailVerified, favorites, history, cart }` (contrato de `GET /api/users/me`, sin `passwordHash`); constante `MAX_PROD_HISTORY = 67` (entero positivo configurable).
  - `index.ts`: exporta el barrel de `profileSchemas.ts` junto al existente. Sin dependencias nuevas (§1).

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1, RF-2, RF-3, RF-4, RF-5, RF-11)*
  - `models/User.ts`: extiende el documento con `favorites: [String]` (vacío por defecto), `history: [{ productId, viewedAt }]` (vacío por defecto), `cart: [{ productId, quantity }]` (vacío por defecto) y `emailVerified: Boolean` (`false` por defecto); nuevo método `toProfileJSON()` que devuelve el perfil público con `favorites ?? []`, `history ?? []`, `cart ?? []` y `emailVerified ?? false` para que los documentos creados antes de 006 (sin esos campos) respondan igual sin migración *(RF-1, RF-2)*. Se conserva `toPublicJSON()` para `/api/auth/*` (005).
  - `services/profileService.ts` (nuevo): `updateProfileData(userId, { name, email, currentPassword })` — verifica `currentPassword` con `verifyPassword` (bcryptjs, reutilizado de `authService`), normaliza el email a minúsculas y propaga duplicados como `409` (índice único + `ConflictError`; el `errorHandler` ya mapea el código 11000); `addFavorite` con `$addToSet` (unicidad atómica por `productId`, que es string como en `products.json`) / `removeFavorite` idempotente con `$pull`; `recordVisit` (mueve al frente con `viewedAt` nuevo, sin duplicados, recorta a `MAX_PROD_HISTORY` importado de `@tiendadcc/utils`); `replaceCart` (reemplazo completo) *(RF-1, RF-3, RF-4, RF-5, RF-11)*.
  - `routes/usersRoutes.ts` + `controllers/usersController.ts` (nuevos): `GET /me`, `PUT /me` (ignora `favorites`, `history`, `cart`, `emailVerified`, `isAdmin` y todo campo extra antes de actualizar), `POST /me/favorites`, `DELETE /me/favorites/:productId`, `POST /me/history`, `PUT /me/cart`; todos tras `requireAuth` (`401` sin sesión) y revalidando el cuerpo con `@tiendadcc/utils` (`400` con errores por campo en español vía `errorHandler`; JSON malformado → `400`; DB caída → `503`) *(RF-2, RF-3, RF-4, RF-5, RF-11)*. Contraseña actual incorrecta → `401` con `UnauthorizedError("La contraseña actual es incorrecta.")` (nuevo mensaje, misma clase existente).
  - `app.ts`: monta `/api/users` junto a `/api/auth` *(RF-2, RNF-2)*.

- **Lógica pura del frontend** — `apps/frontend/client/src/logic/` *(RF-8, RF-10, RF-12, RF-13)*
  - `profileApi.ts` (nuevo): `fetchProfile`, `updateProfile`, `addFavorite`, `removeFavorite`, `recordVisit`, `replaceCart`; `credentials: "include"`, respuestas validadas con `profileSchema`, errores tipados como `AuthResult` (`ok` | `fieldErrors` | `message`) siguiendo el patrón de `authApi.ts` *(RF-8, RF-9, RF-10, RF-11)*.
  - `cartSync.ts` (nuevo): `mergeCarts(local, server, catalog)` pura — suma cantidades por `productId`, descarta ids inexistentes y toma `name`/`price`/`image` del catálogo (misma revalidación de `loadCartFromStorage`, 004 RF-7); indica si hubo fusión real de no vacíos para decidir el aviso *(RF-12)*.
  - `profilePagination.ts` (nuevo): `paginate(items, page, HISTORY_PAGE_SIZE = 10)` puro — recorta la página y calcula `totalPages`; `HISTORY_PAGE_SIZE` vive aquí (constante configurable del frontend, no viaja al backend) *(RF-8)*.
  - `authApi.ts` y `cartStorage.ts` no cambian (el carrito anónimo sigue en `localStorage` clave `cart`).

- **Estado y sincronización** — `src/context/` *(RF-10, RF-12, RF-13)*
  - `CartContext.tsx`: al autenticarse (sesión `authenticated`) fusiona una vez con `mergeCarts` (local + cuenta vía `fetchProfile` o el `cart` ya incluido en el perfil), persiste el resultado con `replaceCart`, actualiza `localStorage` y expone `mergeNotice: string | null` + `dismissMergeNotice()`; con sesión activa, cada cambio persiste con `replaceCart` sin bloquear (error no bloqueante, local como autoridad, reintento en el próximo cambio); la adopción con local vacío no envía `PUT` vacío (regla anti-vaciado de RF-12); al cerrar sesión no toca ni lo local ni la cuenta *(RF-12, RF-13)*.
  - `AuthContext.tsx`: sin cambios salvo que `ProfilePage` usa su `refresh()` tras un `PUT /me` exitoso para reflejar el `name` *(RF-9)*.

- **Presentación** — `src/pages/` y `src/components/` *(RF-7, RF-8, RF-9, RF-10)*
  - `pages/ProfilePage.tsx` (nueva): modo lectura (datos, estado "Cuenta verificada"/"Pendiente de verificación", secciones de favoritos e historial paginado con "Explorar catálogo" en vacíos, resumen "Mi carrito" que abre el drawer, botón "Editar perfil") y modo edición (formulario controlado pre-rellenado + "Contraseña actual" con `TextField`, validación local con el esquema compartido, doble envío bloqueado, foco al error, éxito/error en español) *(RF-8, RF-9)*.
  - `components/FavoriteToggle.tsx` (nuevo): botón corazón con `aria-pressed` y nombre accesible en español; props `productId`, `isFavorite`, `onToggle`, `disabled` *(RF-10, RNF-4)*.
  - `pages/ProductDetailPage.tsx`: agrega `FavoriteToggle` junto a "Agregar al carrito" (autenticado: persiste; anónimo: navega a `/iniciar-sesion`) y registra la visita con `recordVisit` solo si hay sesión y el producto existe, sin bloquear el render *(RF-10)*.
  - `components/CartDrawer.tsx`: muestra el aviso de fusión (`mergeNotice`, `role="status"`, descartable) dentro del panel *(RF-12, RNF-4)*.
  - `App.tsx`: guarda `OnlyAuthenticatedRoute` para `/perfil` (anónimo → `/iniciar-sesion`, neutro durante `loading`) y ruta `#/perfil` *(RF-7)*.

- **Datos** — `src/data/products.json` no cambia: los `productId` de favoritos, historial y carrito son opacos para el backend y se resuelven contra el catálogo en el frontend (fuera de alcance de 006 migrar el catálogo) *(RF-8, RF-10, RF-12)*.

## 2. Modelo de datos
*Cubre: RF-1, RF-2, RF-11.*

Documento `User` extendido en MongoDB (claves en inglés; `passwordHash` nunca sale del backend):

```json
{
  "_id": "6712a4f3c9b1e24a8f0d1234",
  "name": "Ana Pérez",
  "email": "ana@dcc.uchile.cl",
  "passwordHash": "$2b$10$T3rK...hash...",
  "emailVerified": false,
  "favorites": ["taza-dcc"],
  "history": [{ "productId": "polera-dcc", "viewedAt": "2026-10-13T10:00:00.000Z" }],
  "cart": [{ "productId": "taza-dcc", "quantity": 2 }],
  "createdAt": "2026-10-12T12:00:00.000Z",
  "updatedAt": "2026-10-13T10:00:00.000Z"
}
```

Respuesta `GET /api/users/me` (validada con `profileSchema`):

```json
{
  "id": "6712a4f3c9b1e24a8f0d1234",
  "name": "Ana Pérez",
  "email": "ana@dcc.uchile.cl",
  "emailVerified": false,
  "favorites": ["taza-dcc"],
  "history": [{ "productId": "polera-dcc", "viewedAt": "2026-10-13T10:00:00.000Z" }],
  "cart": [{ "productId": "taza-dcc", "quantity": 2 }]
}
```

Cuerpos de entrada (revalidados en el servidor; el email se normaliza a minúsculas):

```json
{ "name": "Ana Pérez", "email": "ana@dcc.uchile.cl", "currentPassword": "secreto123" }
```

```json
{ "productId": "taza-dcc" }
```

```json
[{ "productId": "taza-dcc", "quantity": 2 }]
```

(Los documentos anteriores a 006 no tienen `favorites`/`history`/`cart`/`emailVerified`; `toProfileJSON()` los normaliza a `[]`/`false` al serializar, por lo que no se necesita script de migración. `PUT /me` nunca acepta `favorites`, `history`, `cart` ni `emailVerified`: se escriben solo por sus endpoints propios o son de solo lectura.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Recurso separado `/api/users/me` en vez de extender `/api/auth/me`.**
- Justificación: la spec sanciona `GET/PUT /api/users/me` como recurso de perfil extendido y reserva `/api/auth/*` a la sesión (duda resuelta); separar evita mezclar autenticación con datos de perfil *(RF-2, RF-3)*.
- Alternativa descartada: **`PUT /api/auth/me`**. Acopla el perfil a la sesión y confunde los contratos de 005.

**D2 — Extensión del `User` con valores por defecto y serialización tolerante, sin migración.**
- Justificación: RF-1 exige persistir los campos también para usuarios "creados o migrados"; los `default` de Mongoose más el fallback `?? []`/`?? false` en `toProfileJSON()` lo cumplen sin script de migración *(RF-1, RF-2)*.
- Alternativa descartada: **script de migración puntual**. Añade operativa innecesaria para cuatro campos con valor inicial trivial.

**D3 — `currentPassword` verificado con `verifyPassword` reutilizado, sin endpoint de contraseña.**
- Justificación: RF-3 exige confirmar cada edición con la contraseña actual; reutilizar el comparador bcryptjs de `authService` evita duplicar cripto y el cambio directo de contraseña está fuera de alcance *(RF-3, RNF-3)*.
- Alternativa descartada: **`POST /api/users/me/verify-password` previo al `PUT`**. Dos viajes de ida y vuelta y ventana de carrera entre verificación y actualización.

**D4 — Carrito con reemplazo completo (`PUT /me/cart`) en vez de operaciones por línea.**
- Justificación: el carrito del frontend ya se opera como arreglo completo (004) y es pequeño; un `PUT` validado con `cartSchema` es idempotente y simple de reintentar *(RF-11, RF-13)*.
- Alternativa descartada: **`POST/DELETE` por línea como en favoritos**. Triplica los endpoints y complica la fusión y el reintento (orden de operaciones parciales).

**D5 — Fusión del carrito en el frontend (`mergeCarts` pura) en vez de endpoint de fusión.**
- Justificación: la fusión necesita el catálogo estático, que solo existe en el frontend; una función pura es testeable sin DB ni red y respeta §3 *(RF-12)*.
- Alternativa descartada: **`POST /api/users/me/cart/merge`**. El backend no conoce `products.json` y replicaría la revalidación del frontend.

**D6 — Adopción sin `PUT` vacío (regla anti-vaciado).**
- Justificación: RF-12 lo exige explícito —adoptar con local vacío nunca envía arreglo vacío— porque el auto-persistido de RF-13 haría eco del `[]` y borraría el carrito de la cuenta *(RF-11, RF-12, RF-13)*.
- Alternativa descartada: **persistir siempre tras autenticar**. Correcta cuando hay fusión, destructiva en la adopción.

**D7 — Favoritos solo con cuenta, sin copia local.**
- Justificación: duda resuelta de la spec —no existeihuella local de favoritos y el anónimo es redirigido a `/iniciar-sesion`; la "sincronización" es la persistencia por cuenta *(RF-4, RF-10)*.
- Alternativa descartada: **favoritos en `localStorage` con fusión al login**. Replica toda la maquinaria del carrito para una colección que nace en esta spec y ya es por cuenta.

**D8 — Paginación del historial en el frontend sobre el perfil completo.**
- Justificación: el historial está topado en 67 entradas livianas que ya viajan en `GET /me`; paginar en el cliente con `paginate()` evita parámetros y endpoints extra *(RF-5, RF-8)*.
- Alternativa descartada: **`GET /api/users/me/history?page=`**. Paginación servidora para 67 ids opacos no aporta nada y duplica lógica.

**D9 — Datos del perfil con `profileApi` + estado local de página, sin contexto nuevo.**
- Justificación: el perfil se consume en una sola vista; un cliente tipado más estado local respeta §3 sin añadir un proveedor global que solo usaría `ProfilePage` *(RF-8, RF-9)*.
- Alternativa descartada: **`ProfileContext` global**. Estado compartido innecesario; `AuthContext.refresh()` ya propaga el `name` a `AuthBar`.

**D10 — Aviso de fusión dentro del drawer, sin librería de toasts.**
- Justificación: respuesta del usuario (banner global descartado a favor del drawer); el drawer ya es el lugar donde el carrito se inspecciona, y una región `role="status"` descartable cumple RNF-4 sin dependencias nuevas (§1) *(RF-12, RNF-4)*.
- Alternativa descartada: **toast global o banner bajo el header**. El toast exige librería o sistema propio; el banner compite con el hero de cada vista.

**D11 — `MAX_PROD_HISTORY` en `utils/`, `HISTORY_PAGE_SIZE` en el frontend.**
- Justificación: el tope lo aplica el backend al recortar (debe ser compartido y validable, RF-5/RF-6) mientras el tamaño de página solo afecta presentación (RF-8) *(RF-5, RF-6, RF-8)*.
- Alternativa descartada: **variables de entorno para ambas**. Operativa de despliegue para constantes de dominio ya fijadas en la spec.

**D12 — Tests con la infraestructura existente (supertest + `mongodb-memory-server`, `fetch` simulado); QA manual para contrato.**
- Justificación: §4 y RNF-9 exigen cubrir la lógica; reutilizar `mongoMemory.ts` prueba índice único y flujos reales sin MongoDB externa, como en 005 *(criterio de finalización 15)*.
- Alternativa descartada: **e2e con navegador o MongoDB real**. Fuera del stack de verificación del proyecto y frágil para `npm run check`.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 15.*

- **Lógica pura obligatoria (§4):**
  - `utils/profileSchemas`: `updateProfileSchema` acepta un cuerpo válido y recorta; rechaza nombre vacío/largo, email inválido y `currentPassword` vacío; `cartLineSchema` rechaza cantidad 0/negativa/no entera; `MAX_PROD_HISTORY` es 67. *(Verifica RF-3, RF-6, RF-11)*
  - `cartSync.mergeCarts`: suma cantidades por `productId`, descarta ids inexistentes, toma `name`/`price`/`image` del catálogo, indica fusión real solo si ambos lados eran no vacíos; ambos vacíos → vacío sin aviso. *(Verifica RF-12)*
  - `profilePagination.paginate`: recorta la página de 10, `totalPages` correcto, página fuera de rango → última/página vacía según convención fijada en el test. *(Verifica RF-8)*
  - `profileApi` (con `fetch` simulado): mapea `200` a perfil válido, `400` a `fieldErrors`, `401`/`409` a mensaje, red a mensaje genérico; nunca envía `favorites`/`history`/`cart` en el `PUT /me`. *(Verifica RF-8, RF-9, RF-10, RF-11)*
- **Backend (rutas/controladores, §4, con `mongodb-memory-server`):**
  - `GET /me`: con cookie → `200` con perfil completo (incluye `cart`); sin cookie → `401`; usuario con documento legacy (sin campos nuevos) → `200` con `[]`/`false`. *(Verifica RF-1, RF-2)*
  - `PUT /me`: válido + contraseña correcta → `200` y persiste normalizado; contraseña incorrecta/ausente → `401` sin cambios; cuerpo inválido → `400`; correo de otro (incluso con distinto caso) → `409`; cuerpo con `isAdmin`/`favorites`/`cart` → se ignoran. Nunca expone `passwordHash`. *(Verifica RF-3, RF-6)*
  - Favoritos: agregar → `200`; duplicado → `200` sin duplicar (incluidas dos altas concurrentes del mismo `productId` → un solo elemento, por `$addToSet`); inválido → `400`; eliminar existente/inexistente → `200` (idempotente); sin sesión → `401`. *(Verifica RF-4)*
  - Historial: registra y mueve al frente con `viewedAt` nuevo; supera 67 → recorta a las 67 recientes; inválido → `400`; sin sesión → `401`. *(Verifica RF-5)*
  - `PUT /cart`: válido → `200` y reemplaza; inválido → `400` sin cambios; `[]` → vacía con `200`; sin sesión → `401`. *(Verifica RF-11)*
- **Frontend (smoke de render, no exige cobertura, §4):**
  - `ProfilePage`: lectura con datos/estado/secciones; edición pre-rellenada, validación local, éxito (llama `refresh`), errores `400/401/409`, "Cancelar" sin enviar; carga/error con "Reintentar"; historial paginado (cambia de página); resumen "Mi carrito" abre el drawer. *(RF-8, RF-9)*
  - Ruta `/perfil`: anónimo → `/iniciar-sesion`; `loading` neutro; autenticado → perfil. *(RF-7)*
  - `FavoriteToggle` en detalle: autenticado alterna y persiste; anónimo navega a login; visita registra historial solo con sesión y producto existente. *(RF-10)*
  - `CartContext` + drawer: fusión con aviso `role="status"` descartable en el drawer; adopción sin `PUT` vacío (fetch simulado: ningún `PUT []` tras login con local vacío); cambio con sesión → `PUT`; fallo → error no bloqueante y reintento; logout no altera carritos; anónimo sin red. *(RF-12, RF-13)*
  - Tests existentes afectados (`App.test.tsx` y los que rendericen detalle/header) se actualizan sin eliminar aserciones vigentes.
- **Verificación de contrato por QA (manual):**
  - Flujo real con MongoDB: registro nuevo → `/perfil` muestra datos y secciones vacías con "Explorar catálogo".
  - Edición con contraseña correcta/incorrecta, correo duplicado con distinto caso, "Cancelar".
  - Favorito desde detalle y perfil; recarga lo conserva; anónimo redirige a login.
  - Historial con >10 visitas pagina; visita 68ª descarta la más antigua.
  - Carrito invitado + carrito de cuenta → login fusiona con aviso en el drawer; invitado vacío + cuenta con carrito → adopta sin vaciar (verificar en DB que el carrito sigue).
  - Cambio con sesión persiste (recarga en otro navegador lo refleja tras login); logout conserva ambos; anónimo sin llamadas a `/api/users`.
  - Teclado, foco visible, `aria-pressed`/`role="status"`/`role="alert"`, textos en español, 360 px sin scroll horizontal.
- **Red / mocking:** backend sustituye MongoDB con `mongodb-memory-server`; frontend simula `fetch`; `products.json` se importa directo (sin red). Sin e2e.
- **Comando de cierre:** `npm run check` en la raíz (`tsc --noEmit` + Vitest de `utils`, backend y frontend) debe pasar antes de dar por terminada la tarea.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `utils/profileSchemas.ts` + `MAX_PROD_HISTORY` | RF-3, RF-4, RF-5, RF-6, RF-11 |
| `models/User.ts` extendido + `toProfileJSON()` | RF-1, RF-2 |
| `profileService` (update, favoritos, visitas, carrito) | RF-1, RF-3, RF-4, RF-5, RF-11 |
| `usersRoutes` + `usersController` + `requireAuth` + `errorHandler` | RF-2, RF-3, RF-4, RF-5, RF-11 |
| `app.ts` monta `/api/users` | RF-2, RNF-2 |
| `logic/profileApi.ts` | RF-8, RF-9, RF-10, RF-11 |
| `logic/cartSync.ts` (`mergeCarts`) | RF-12 |
| `logic/profilePagination.ts` | RF-8 |
| `CartContext` extendido (fusión, persistencia, aviso, adopción) | RF-12, RF-13 |
| `ProfilePage` (lectura, edición, secciones, resumen carrito) | RF-8, RF-9 |
| `FavoriteToggle` + detalle (registro de visita, toggle, redirect anónimo) | RF-10 |
| `CartDrawer` (aviso `role="status"`) | RF-12 |
| Guarda `OnlyAuthenticatedRoute` + ruta `#/perfil` en `App.tsx` | RF-7 |
| `products.json` sin cambios (ids opacos) | RF-8, RF-10, RF-12 |
| Tests de lógica pura, backend y smoke de frontend en Vitest | verificación RF-1…RF-13 (§4) |

---

*Nota:* la spec 006 no deja dudas abiertas; todas fueron resueltas (orden backend→frontend→sincronización, persistencia completa, edición con `currentPassword`, cambio de contraseña vía correo como fuera de alcance, ruta `/perfil`, fusión por suma con aviso en el drawer, favoritos solo con cuenta, `MAX_PROD_HISTORY` = 67 con paginación de 10). El plan asume los valores más conservadores ya fijados: `PUT` de reemplazo para el carrito, adopción sin escritura, paginación solo en cliente y sin dependencias nuevas. El siguiente paso según el flujo es generar `specs/006-user-profile/tasks.md` (fuera de esta skill).
