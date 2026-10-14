# Plan 007 — Pulido del perfil y la navegación

Plan de implementación para la spec `007-profile-polish`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-9. Cada sección indica qué RF atiende. La 006 queda congelada: este plan solo toca lo que la 007 declara (nuevo o `modifica 00N/RF-x`).

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9.*

Se trabaja sobre lo construido en 005/006: `@tiendadcc/utils` compartido, `User` con `toPublicJSON()`/`toProfileJSON()`, `requireAuth` + `errorHandler`, `AuthContext`, `CartContext` con huella y `profileApi.ts`. La lógica vive en servicios backend y funciones puras frontend, nunca en componentes (§3).

- **Esquemas compartidos** — `utils/src/` *(RF-1, RF-2)*
  - `authSchemas.ts`: `usernameField` (`trim`, minúsculas, 1–80, mensajes en español); `registerInputSchema` suma `username` + `displayName` (1–80 con `trim`); `loginInputSchema` sin cambios (sigue por correo); `publicUserSchema` suma `username` + `displayName`.
  - `profileSchemas.ts`: `updateProfileSchema` pasa a `{ username, displayName, email, currentPassword }` (todos requeridos, mismos criterios); `profileSchema` suma `username` + `displayName`.

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1)*
  - `models/User.ts`: `username` (`unique`, `lowercase`, `trim`, requerido) + `displayName` (`trim`, 1–80, requerido); `toPublicJSON()`/`toProfileJSON()` incluyen ambos y adoptan `name` en documentos legacy (sin migración) *(RF-1)*.
  - `services/authService.ts`: `createUser` verifica duplicado de `username` (insensible a caso) y de correo → `ConflictError` con mensaje propio en español *(RF-1)*.
  - `services/profileService.ts`: `updateProfileData` acepta `username`/`displayName`, verifica `currentPassword` igual que hoy y responde `409` ante `username` ajeno (excluyendo al propio) *(RF-1)*.
  - `controllers/` + `errorHandler.ts`: el `PUT /api/users/me` deja de ignorar `username` (sigue ignorando `favorites`/`history`/`cart`/`emailVerified`/`isAdmin`); el manejador de clave duplicada distingue `keyValue.username` de `keyValue.email` para el mensaje `409` *(RF-1)*.
  - Índice único de `username`: si la base tuviera `name` duplicados legacy, la creación del índice falla; se verifica en desarrollo/staging antes de desplegar (caso límite de la spec).

- **Lógica pura del frontend** — `src/logic/` *(RF-8, RF-9)*
  - `profilePagination.ts`: suma `FAVORITES_PAGE_SIZE = 12` (constante configurable del frontend) junto al `HISTORY_PAGE_SIZE = 10` existente, que se reutiliza como lote inicial y de cada "Cargar anteriores" *(RF-8, RF-9)*.
  - `profileApi.ts`, `cartSync.ts`, `cartStorage.ts`: sin cambios (los contratos ya validan con los esquemas extendidos).

- **Presentación** — `src/pages/` y `src/components/` *(RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9)*
  - `RegisterPage.tsx`: suma "Nombre de usuario" y "Nombre a mostrar" controlados (orden de foco y `FIELD_ORDER` actualizados), valida con el esquema extendido y muestra el `409` de `username`/correo *(RF-2)*.
  - `ProfilePage.tsx`: lectura muestra `username` + `displayName` + correo + estado; edición con los tres campos + "Contraseña actual"; favoritos como grilla de mini-tarjetas paginada de 12; historial como carrusel con "Cargar anteriores" y fecha es-CL; conserva resumen "Mi carrito", carga/error con "Reintentar" y vacíos *(RF-1, RF-8, RF-9)*.
  - `components/FavoriteProductCard.tsx` (nuevo): mini-tarjeta (imagen, nombre, precio CLP, enlace al detalle) con `onRemove?` opcional (botón "Eliminar" con papelera + texto y `aria-label`); se usa en favoritos (con eliminar) e historial (sin eliminar + fecha) *(RF-8, RF-9)*.
  - `components/ProductCard.tsx`: overlay sobre la imagen con fondo de superficie y dos botones de ícono (carrito + corazón con `aria-pressed` y relleno activo); se retira el botón textual "Agregar" conservando sus nombres accesibles; sin anidar interactivos y sin navegar al activar *(RF-6)*.
  - `pages/ProductDetailPage.tsx`: favorito con corazón + texto ("Agregar/Quitar de favoritos") en la misma fila y altura que "Agregar al carrito"; anónimo → `/iniciar-sesion` según 006/RF-10 *(RF-7, RF-10 de 006)*.
  - `components/Header.tsx`: con sesión muestra el botón `[DisplayName]` (nombre accesible "Mi perfil", → `/perfil`); sin sesión mantiene "Perfil" → `/iniciar-sesion`; Favoritos sin cambios (006/RF-14); hamburguesa bajo `sm` con Catálogo/Favoritos/cuenta (logo y carrito siempre visibles, cierre con selección/`Escape` y retorno de foco); se elimina la prop `showBackButton` y el botón "Volver" *(RF-3, RF-4, RF-5)*.
  - Páginas (`HomePage`, `CatalogPage`, `ProductDetailPage`, `RegisterPage`, `LoginPage`, `ProfilePage`): quitan `showBackButton`/`backLabel`; el logo sigue a `/` *(RF-4)*.
  - `components/AuthBar.tsx`: muestra `displayName` en vez de `name` *(RF-3, 005/RF-6)*.

- **Datos** — `src/data/products.json` sin cambios (los `productId` siguen opacos para el backend) *(RF-6, RF-8, RF-9)*.

## 2. Modelo de datos
*Cubre: RF-1.*

Documento `User` extendido (claves en inglés; `passwordHash` nunca sale):

```json
{
  "_id": "6712a4f3c9b1e24a8f0d1234",
  "username": "anaperez",
  "displayName": "Ana Pérez",
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

Contrato público (registro, login, `GET /api/auth/me`, `GET /api/users/me`):

```json
{
  "id": "6712a4f3c9b1e24a8f0d1234",
  "username": "anaperez",
  "displayName": "Ana Pérez",
  "email": "ana@dcc.uchile.cl"
}
```

(`GET /api/users/me` suma además `emailVerified`, `favorites`, `history` y `cart` según 006. El `username` se almacena en minúsculas como el correo; el `displayName` conserva formato. Los documentos legacy adoptan `name` en ambos campos al serializar, sin script de migración.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — `username` en minúsculas con índice único MongoDB.**
- Justificación: RF-1 exige unicidad insensible a caso; normalizar a minúsculas (igual que el correo en 005) lo implementa con un índice simple y búsquedas exactas *(RF-1)*.
- Alternativa descartada: **índice con `collation` preservando caso**. Más expresivo, pero añade configuración de índice y consultas con `collation` en cada uso; el `username` no se muestra (solo identifica), así que no aporta nada visible.

**D2 — `displayName` sin índice ni unicidad.**
- Justificación: RF-1 lo declara no necesariamente único; un índice sobra y un `409` rompería el criterio *(RF-1)*.
- Alternativa descartada: **unicidad también para `displayName`**. Confunde identidad con presentación y rechazaría nombres legítimamente repetidos.

**D3 — `username` editable en `PUT /me` con `currentPassword` y `409`.**
- Justificación: la spec lo pide editable solo en el perfil; entra por el mismo `PUT` validado y confirmado que el resto de la identidad (006/RF-3), excluyendo al propio usuario del chequeo de duplicados *(RF-1)*.
- Alternativa descartada: **inmutabilidad total** (primer borrador de la 007). El usuario la descartó explícitamente por querer evolución futura hacia login por `username`.

**D4 — Mensaje de clave duplicada según `keyValue`.**
- Justificación: el `errorHandler` actual dice "correo" ante cualquier 11000; con dos campos únicos debe distinguir `username` de `email` para no mentir al usuario *(RF-1)*.
- Alternativa descartada: **mensaje genérico único**. Menos útil y rompe los tests que esperan el mensaje específico de correo.

**D5 — Botón `[DisplayName]` en vez de saludo + botón.**
- Justificación: respuesta del usuario (duda resuelta): sin saludo ni botón "Perfil"; el nombre es el acceso, con nombre accesible "Mi perfil" *(RF-3)*.
- Alternativa descartada: **texto "Bienvenid@, X" + botón Perfil**. Duplica accesos a la misma ruta y alarga el header en móvil.

**D6 — Eliminar `showBackButton` por completo (prop incluida).**
- Justificación: RF-4 elimina el botón en todas las vistas; dejar la prop invitaría a reintroducirlo y rompería la uniformidad *(RF-4)*.
- Alternativa descartada: **conservar la prop sin uso**. Código muerto con tests que la referencian.

**D7 — Hamburguesa bajo `sm` con carrito y logo siempre visibles.**
- Justificación: respuesta del usuario (duda resuelta) y RNF-6: el carrito es acción permanente (004) y el logo es la salida principal tras RF-4 *(RF-5)*.
- Alternativa descartada: **colapsar todo incluido el carrito**. Esconde la acción principal de compra en la vista con más fricción.

**D8 — Íconos overlay que superseden el "Agregar" textual.**
- Justificación: RF-6 pide íconos visibles con fondo distintivo siempre operables (táctil); conservar además el botón textual duplicaría la acción y alargaría la tarjeta *(RF-6, modifica 004/RF-3)*.
- Alternativa descartada: **mantener ambos**. Dos controles para lo mismo en cada tarjeta, ruido visual y de tabulación.

**D9 — Mini-tarjeta compartida para favoritos e historial.**
- Justificación: RF-8 y RF-9 piden la misma presentación (imagen, nombre, precio, enlace); un componente con `onRemove?` y `viewedAt?` opcionales evita duplicar marcado (§3) *(RF-8, RF-9)*.
- Alternativa descartada: **dos componentes espejo**. Divergen con el tiempo y duplican tests.

**D10 — Carrusel en cliente con lotes de 10 reutilizando `HISTORY_PAGE_SIZE`.**
- Justificación: RF-9 reemplaza paginación por carga progresiva sobre el historial completo (≤67 livianos que ya viajan en `GET /me`); reutilizar la constante evita una nueva *(RF-9)*.
- Alternativa descartada: **paginación servidora**. Para 67 ids opacos no aporta nada (mismo argumento de 006/D8).

**D11 — `FAVORITES_PAGE_SIZE = 12` en el frontend.**
- Justificación: RF-8 fija 12 (grilla 1→2→3 columnas); constante configurable junto a la de historial *(RF-8)*.
- Alternativa descartada: **reutilizar 10**. Rompería la grilla completa en escritorio (3 columnas × filas incompletas).

**D12 — Tests con la infraestructura existente; QA manual para contrato.**
- Justificación: §4 y RNF-8; se reutilizan `mongoMemory.ts`, `fetch` simulado y `stubAuthFetch` como en 005/006 *(criterio de finalización 12)*.
- Alternativa descartada: **e2e con navegador o MongoDB real**. Fuera del stack de verificación y frágil para `npm run check`.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 12.*

- **Lógica pura obligatoria (§4):**
  - `utils`: registro acepta `username`+`displayName` y normaliza el primero a minúsculas; rechaza `username` vacío/largo, `displayName` vacío/largo; duplicados de `displayName` válidos en esquema (la unicidad es de persistencia, no de forma); `updateProfileSchema` exige `username`+`displayName`; `publicUserSchema`/`profileSchema` exigen ambos. *(Verifica RF-1, RF-2)*
  - `profilePagination`: `FAVORITES_PAGE_SIZE` es 12 y pagina la grilla; `paginate` del historial sigue en 10 para los lotes. *(Verifica RF-8, RF-9)*
- **Backend (rutas/controladores, §4, con `mongodb-memory-server`):**
  - Registro con ambos campos → `201`; `username` duplicado en distinto caso → `409` en español; `displayName` duplicado → `201`; registro concurrente al mismo `username` → un `201` y un `409`. *(Verifica RF-1, RF-2)*
  - `PUT /me` cambia `username` con contraseña correcta → `200`; `username` ajeno → `409` sin cambios; propio conservado → `200`; ya no ignora `username` pero sigue ignorando el resto. *(Verifica RF-1)*
  - Contratos (`register`, `login`, `me`, `GET /users/me`) incluyen `username`+`displayName` sin `passwordHash`; documento legacy adopta `name` en ambos. *(Verifica RF-1)*
  - Clave duplicada por carrera responde `409` con el mensaje del campo correspondiente (`keyValue`). *(Verifica RF-1)*
- **Frontend (smoke de render, no exige cobertura, §4):**
  - `RegisterPage`: cinco campos, validación local, `409` de `username` sin perder datos, navegación a `/` al registrar. *(RF-2)*
  - `Header`: con sesión botón `[DisplayName]` → `/perfil` (nombre accesible "Mi perfil") y sin "Volver"; sin sesión "Perfil" → login; burger <640 px (abre/cierra con `aria-expanded`, `Escape`, retorno de foco) y nav completo ≥640 px. *(RF-3, RF-4, RF-5)*
  - `ProductCard`: íconos visibles con nombres accesibles, `hover` con énfasis, corazón relleno si favorito, anónimo → login, sin navegar al activar, sin botón textual. *(RF-6)*
  - `ProductDetailPage`: botón textual con corazón alineado, alternancia y redirect anónimo. *(RF-7)*
  - `ProfilePage`: lectura con `username`+`displayName`, edición de los tres campos con `currentPassword`, favoritas en grilla paginada de 12 con "Eliminar", historial en carrusel con fecha es-CL y "Cargar anteriores" hasta agotar, vacíos preservados. *(RF-1, RF-8, RF-9)*
  - `AuthBar`: muestra `displayName`. *(RF-3)*
  - Tests existentes afectados (`App.test.tsx`, `ProductGrid`, `CatalogPage`, `RegisterPage`, `Header`, detalle, perfil, `HomePage` si referencia "Volver") se actualizan sin eliminar aserciones vigentes.
- **Verificación de contrato por QA (manual):**
  - Registro con `username` duplicado (ambos casos), edición de `username`/`displayName`/correo con contraseña correcta e incorrecta.
  - Header: `[DisplayName]` → perfil, burger en 360 px (abre, navega, `Escape`), sin "Volver" en ninguna vista, logo a `/`.
  - Tarjeta: íconos sobre imagen legibles en claro/oscuro (solo inspección visual; el fix de modo oscuro está fuera de alcance), anónimo a login, sin navegación accidental, táctil sin `hover`.
  - Favoritas: grilla alineada 1→2→3, 13 favoritas → 2 páginas, eliminar directo.
  - Historial: carrusel horizontal sin scroll de página, fecha en español, "Cargar anteriores" hasta agotar.
  - Legacy: usuario creado antes de 007 adopta `name` en ambos campos.
- **Red / mocking:** backend con `mongodb-memory-server`; frontend con `fetch` simulado y `stubAuthFetch`; `products.json` directo, sin red real ni e2e.
- **Comando de cierre:** `npm run check` en la raíz (`tsc --noEmit` + Vitest de `utils`, backend y frontend) debe pasar antes de dar por terminada la tarea.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `authSchemas` + `profileSchemas` extendidos | RF-1, RF-2 |
| `models/User.ts` (`username` único + `displayName`) + adopción legacy | RF-1 |
| `authService.createUser` + `profileService.updateProfileData` + `409` por `keyValue` | RF-1 |
| `RegisterPage` (ambos campos) | RF-2 |
| `Header` (`[DisplayName]`, burger, sin "Volver") + páginas sin `showBackButton` | RF-3, RF-4, RF-5 |
| `AuthBar` (`displayName`) | RF-3 |
| `ProductCard` (íconos overlay) | RF-6 |
| `ProductDetailPage` (texto + corazón) | RF-7 |
| `FavoriteProductCard` + grilla paginada en `ProfilePage` | RF-8 |
| Carrusel + "Cargar anteriores" + fecha es-CL en `ProfilePage` | RF-9 |
| `FAVORITES_PAGE_SIZE` + lotes de historial | RF-8, RF-9 |
| Tests de lógica pura, backend y smoke de frontend en Vitest | verificación RF-1…RF-9 (§4) |

---

*Nota:* la spec 007 no deja dudas abiertas; todas fueron resueltas (nueva spec delta, captura en registro+perfil, `username` único y editable en perfil con `currentPassword`, burger completo salvo carrito, botón `[DisplayName]`, mini-tarjetas con "Eliminar" de 12, carrusel con lotes de 10 y fecha es-CL, modo oscuro diferido, `any` inexistente). El plan asume los valores más conservadores ya fijados. El siguiente paso según el flujo es generar `specs/007-profile-polish/tasks.md` (fuera de esta skill).
