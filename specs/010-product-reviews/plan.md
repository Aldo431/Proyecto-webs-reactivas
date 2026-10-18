# Plan 010 — Reseñas de productos

Plan de implementación para la spec `010-product-reviews`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-6. Cada sección indica qué RF atiende. Las specs 005 y 008 quedan congeladas: este plan solo agrega una colección, endpoints y una sección de UI nuevas, sin tocar sus contratos.

## 1. Estructura de módulos
*Cubre: RF-1 … RF-6.*

Se trabaja sobre lo construido en 008/009: `productSchema`/`productSellerSchema` en `@tiendadcc/utils`, `GET /api/products/:id` con `isObjectIdString`/`findPublicProduct` en `productService.ts`, `requireAuth`, `errorHandler`, `productApi.ts`, `useProduct` y `ProductDetailPage.tsx`. La lógica vive en el servicio del backend y en funciones/hooks puros del frontend, nunca en componentes (§3). Antes de tocar UI se lee `specs/00-design-system/spec.md` (AGENTS.md).

- **Esquemas compartidos** — `utils/src/reviewSchemas.ts` (nuevo) *(RF-1, RF-2, RF-3, RF-4, RF-5)*
  - `RATING_MIN = 1`, `RATING_MAX = 5`, `COMMENT_MAX_LENGTH = 500`, `MAX_REVIEWS_LIMIT = 20`.
  - `ratingField = z.number({ error: "La calificación es obligatoria." }).int("La calificación debe ser un número entero.").min(1, …).max(5, …)`.
  - `commentField = z.string({ error: "El comentario es obligatorio." }).trim().min(1, "El comentario es obligatorio.").max(500, "El comentario no puede superar los 500 caracteres.")`.
  - `reviewAuthorSchema = { id, username, displayName }` (shape del autor que se expone; mismo contenido que `productSellerSchema`, con nombre propio del dominio).
  - `reviewSchema = { id, productId, author: reviewAuthorSchema, rating, comment, createdAt: ISO, updatedAt: ISO }` (contrato público, sin correo, RF-1/RNF-7).
  - `createReviewInputSchema = { rating, comment }`; `updateReviewInputSchema = createReviewInputSchema.partial().refine(al menos un campo presente, "No hay cambios para guardar.")` (mismo patrón que `updateProductInputSchema`, RF-3).
  - `reviewListSchema = { reviews: z.array(reviewSchema), total: int ≥ 0, promedioRating: number(0–5).nullable() }` y tipo `ReviewList`.
  - Reexport desde `utils/src/index.ts` (junto a `authSchemas`, `profileSchemas`, `productSchemas`).

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1, RF-2, RF-3, RF-4, RF-5)*
  - `models/Review.ts` (nuevo): esquema con `product` (ObjectId ref `Product`, index), `author` (ObjectId ref `User`, index), `rating` (Number), `comment` (String) y `timestamps`. Índice único compuesto `{ product: 1, author: 1 }` (una reseña por usuario y producto, RF-2) e índice de listado `{ product: 1, createdAt: -1, _id: -1 }` (RF-1). Validadores de respaldo en el modelo, en línea con `Product.ts`. Función `toPublicReview(review: ReviewWithAuthor): Review` que serializa `{ id, productId, author: { id, username, displayName }, rating, comment, createdAt, updatedAt }` y tipos `ReviewFields`/`ReviewWithAuthor`.
  - `services/reviewService.ts` (nuevo), reutilizando `isObjectIdString` exportado por `productService.ts` y las clases de `errors.ts`:
    - `listProductReviews(productId)`: valida el id (404 "Producto no encontrado."), comprueba que el producto exista (404), cuenta `total = countDocuments({ product })`, calcula `promedioRating` (media redondeada a 2 decimales, `null` si no hay reseñas) y trae hasta `MAX_REVIEWS_LIMIT` reseñas ordenadas `{ createdAt: -1, _id: -1 }` con `populate("author", "username displayName")`. Devuelve `ReviewList`.
    - `createReview(userId, productId, input)`: valida id y existencia del producto (404); crea la reseña; ante el error de clave duplicada (`code === 11000`) lanza `ConflictError("Ya has reseñado este producto.")` (409) y no deja creación parcial. Devuelve la reseña pública (RF-2).
    - `updateReview(userId, reviewId, input)`: valida id y existencia de la reseña (404 "Reseña no encontrada."); si `author !== userId` lanza `ForbiddenError("No puedes modificar una reseña de otro usuario.")` (403); aplica `$set` de los campos presentes con `runValidators` y devuelve la reseña pública (RF-3).
    - `deleteReview(userId, reviewId)`: misma verificación de existencia (404) y propiedad (403); borra con `deleteOne` (RF-4).
    - Helpers internos `assertReviewAuthor` (404 antes que 403, como `assertProductOwner`) y `averageRating`.
  - `controllers/reviewsController.ts` (nuevo): `listProductReviewsHandler` (`GET`, público), `createReviewHandler` (`POST`, usa `request.user.id`), `updateReviewHandler` y `deleteReviewHandler`. Parsean con los esquemas de `@tiendadcc/utils` (Zod → `errorHandler` responde 400 en español) y usan un `reviewIdParam` propio; el orden 401 → 404 → 403 → 400 lo garantiza `requireAuth` + el servicio antes de validar el cuerpo.
  - `routes/reviewsRoutes.ts` (nuevo): exporta `productReviewsRoutes = Router({ mergeParams: true })` con `GET "/"` (público) y `POST "/"` (`requireAuth`), y `reviewsRoutes = Router()` con `PUT "/:id"` y `DELETE "/:id"` (ambos `requireAuth`).
  - `routes/productsRoutes.ts`: registrar `productsRoutes.use("/:id/reviews", productReviewsRoutes)` **antes** de `/:id` (como `/mine`), para que `request.params.id` llegue al subrouter.
  - `app.ts`: montar `app.use("/api/reviews", reviewsRoutes)`.

- **Lógica pura del frontend** — `apps/frontend/client/src/logic/` *(RF-5, RF-6)*
  - `reviewApi.ts` (nuevo): mismo patrón que `productApi.ts` (resultado discriminado `{ ok: true, … } | { ok: false, message, fieldErrors?, notFound? }`, `readErrorBody`, `failureFromStatus`, `STATUS_MESSAGES`, `credentials: "include"`). `fetchReviews(productId)` (valida con `reviewListSchema`), `createReview(productId, input)` (201, valida con `reviewSchema`), `updateReview(reviewId, input)` (200), `deleteReview(reviewId)` (204). URLs: productos vía `/api/products/<id>/reviews` y reseñas vía `/api/reviews/<id>` (helper `buildUrl` propio).
  - `reviewFormat.ts` (nuevo, puro): `findOwnReview(reviews, userId)` (resuelve la reseña del usuario o `undefined`), `formatAverageRating(average)` (p. ej. `"4,5"` o `null` cuando no hay) y `averageStars(average)` (entero de estrellas llenas para el resumen). Tests obligatorios (§4).
  - `useReviews.ts` (nuevo): hook con estado discriminado `loading | error | success` (patrón `isCurrent` de `useProduct`) que carga `{ reviews, total, promedioRating }` por `productId`, expone `retry` y expone `{ addReview, editReview, removeReview }` que llaman a `reviewApi` y, al tener éxito, **recargan** el listado (D9).

- **Presentación** — `apps/frontend/client/src/pages/` y `components/` *(RF-6)*
  - `components/StarRatingInput.tsx` (nuevo): grupo de radios accesible (`<fieldset>` + `<legend>` "Tu calificación" + 5 `<input type="radio">` ocultos con etiqueta de estrella), operable por teclado (D8).
  - `components/StarRatingDisplay.tsx` (nuevo): estrellas de solo lectura con `aria-label` "N de 5 estrellas" (para cada reseña y el resumen).
  - `components/ReviewForm.tsx` (nuevo): `StarRatingInput` + `Textarea` (de `ui/`) para el comentario, con el patrón de error accesible de `TextField` (`aria-invalid`/`aria-describedby` + `role="alert"`). Props `{ initial?, onSubmit, onCancel, submitting, fieldErrors }`; sirve igual para publicar y para editar precargado.
  - `components/ReviewCard.tsx` (nuevo): autor (`displayName`), calificación, comentario (texto literal, sin marcado), fecha y, si es propia, control "Editar" + borrado con `ConfirmDeleteDialog`.
  - `components/ReviewList.tsx` (nuevo): sección completa — resumen (`total` + `promedioRating` o estado vacío "Sé el primero en reseñar este producto."), aviso de sesión para anónimos, formulario/edición para autenticados, y los estados de carga/error con "Reintentar" (patrón de `ProductDetailPage`).
  - `components/ConfirmDeleteDialog.tsx` (modificar): sumar props opcionales (`title`, `description`, `confirmLabel`, `triggerLabel`, `triggerAriaLabel`) con los valores actuales de producto por defecto, para reutilizarlo en reseñas sin duplicar el diálogo ni romper sus usos existentes (D7).
  - `pages/ProductDetailPage.tsx` (modificar): renderizar `<ReviewList productId={product.id} />` como sección nueva bajo el grid del producto, sin alterar el contenido actual (002/RF-2).

## 2. Modelo de datos JSON
*Cubre: RF-1, RF-2, RF-3.*

No hay cambios al modelo `Product` ni `User`. Se agrega la colección `reviews` y dos formas de datos nuevas: la respuesta pública del listado y los cuerpos de creación/edición.

Respuesta de `GET /api/products/:id/reviews` (contrato público, sin correo del autor):

```json
{
  "reviews": [
    {
      "id": "6713b0c2a1f4e9d2c8b70a99",
      "productId": "68f1c2a9b3d4e5f60718293a",
      "author": { "id": "68f1c2a9b3d4e5f60718293b", "username": "anaperez", "displayName": "Ana Pérez" },
      "rating": 4,
      "comment": "Muy buena calidad.",
      "createdAt": "2026-10-14T12:00:00.000Z",
      "updatedAt": "2026-10-14T12:00:00.000Z"
    }
  ],
  "total": 12,
  "promedioRating": 4.25
}
```

Cuerpos de creación (`POST /api/products/:id/reviews`) y edición (`PUT /api/reviews/:id`):

```json
{ "rating": 5, "comment": "Excelente producto." }
```

(Claves en inglés; textos de usuario en español solo en la UI. Ambas respuestas se validan con `reviewListSchema`/`reviewSchema` de `@tiendadcc/utils` antes de usarse — AGENTS.md. `promedioRating` es `null` sin reseñas.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Una reseña por usuario y producto garantizada con índice único compuesto `{ product, author }`.**
- Justificación: RF-2 prohíbe una segunda reseña del mismo usuario; el índice único lo garantiza incluso ante dobles envíos simultáneos, sin ventana de carrera.
- Alternativa descartada: **Consultar existencia y luego insertar en el servicio**. Deja una ventana de carrera entre la consulta y la escritura que duplica reseñas.

**D2 — Promedio y total calculados en el servicio, no persistidos en `Product`.**
- Justificación: RF-1 exige `total` y `promedioRating`; calcularlos con `countDocuments`/agregación al leer no toca el contrato de 008 y siempre está consistente con las reseñas reales (RNF-7).
- Alternativa descartada: **Campos `ratingAvg`/`ratingCount` en `Product`**. Desnormaliza y puede desincronizarse al editar o borrar; además modifica el modelo congelado de 008.

**D3 — Listado sin paginación, con tope de 20 más recientes y orden fijo.**
- Justificación: RF-1 fija el tope `MAX_REVIEWS_LIMIT = 20` y el orden descendente; el total y el promedio consideran todas. Mantiene la sección simple y evita superficie de consulta (Fuera de alcance).
- Alternativa descartada: **Paginación de reseñas**. Fuera de alcance de la spec y añade controles que el detalle no necesita en esta fase.

**D4 — Autor expuesto como `{ id, username, displayName }` poblado desde `User`.**
- Justificación: RF-1/RNF-7 solo permiten datos públicos; incluir `id` permite al frontend marcar "mi reseña" (`findOwnReview`) sin exponer correo ni hash, con el mismo shape que `productSellerSchema` de 008.
- Alternativa descartada: **Guardar solo `displayName` denormalizado en `Review`**. Pierde el `id` para comparar con la sesión y queda obsoleto si el usuario cambia su nombre.

**D5 — Orden de verificación 401 → 404 → 403 → 400 (propiedad antes que validación).**
- Justificación: RF-3/RF-4 exigen `403` para no-autor y `404` para inexistente; verificar existencia y propiedad antes de parsear el cuerpo evita que un no-autor reciba errores de validación filtrados, igual que `assertProductOwner` en 008/RF-10.
- Alternativa descartada: **Validar el cuerpo primero**. Mezcla respuestas (400 antes que 403) y rompe el contrato de errores.

**D6 — Duplicado detectado por el índice y traducido a `409` con mensaje de reseña en el servicio.**
- Justificación: RF-2 pide `409` con mensaje en español específico; `errorHandler` hoy traduce cualquier clave duplicada a mensajes de cuenta (username/email), por lo que la traducción correcta debe ocurrir en `createReview` con una `ConflictError`.
- Alternativa descartada: **Dejar que `errorHandler` maneje el 11000**. Respondería un mensaje de cuenta equivocado para una reseña duplicada.

**D7 — Reutilizar `ConfirmDeleteDialog` generalizándolo con props opcionales.**
- Justificación: RF-6 pide confirmación antes de borrar y §3 evita duplicar UI; añadir props con valores por defecto de producto mantiene intactos los usos actuales (mis publicaciones/edición) y sirve a reseñas.
- Alternativa descartada: **Crear un diálogo de borrado de reseña aparte**. Duplica la lógica de foco/estado del diálogo de 008.

**D8 — Selector de estrellas como grupo de radios accesible, no iconos clicables.**
- Justificación: RNF-3 exige operación por teclado con nombre accesible; un `fieldset` de radios cumple por defecto (foco, flechas, lector de pantalla).
- Alternativa descartada: **Estrellas como `<div>`/`<span>` con `onClick`**. No es accesible por teclado ni anuncia el valor.

**D9 — Tras cada mutación, la UI recarga el listado con el resumen del servidor.**
- Justificación: RF-6 pide que la reseña aparezca y que el resumen se recalcule; recargar evita duplicar la lógica del promedio en el cliente y mantiene el servidor como única fuente del contrato (RNF-2, §3).
- Alternativa descartada: **Recalcular `total`/`promedioRating` en el cliente**. Duplica lógica de negocio y puede divergir del backend.

**D10 — Validación Zod compartida en `utils/` como única fuente de entrada y salida.**
- Justificación: AGENTS.md exige validar toda entrada externa con Zod; el mismo `createReviewInputSchema`/`updateReviewInputSchema` lo usa el controlador (400) y el cliente, y `reviewSchema`/`reviewListSchema` validan las respuestas, como ya hace 008/009 (RF-5, §6 para mensajes en español).
- Alternativa descartada: **Validar a mano en cada lado**. Duplica reglas (rating 1–5, largo del comentario) y diverge con el tiempo.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 9.*

- **Lógica pura obligatoria (§4):**
  - `utils` (`reviewSchemas.test.ts`): `rating` válido 1–5; rechazo de `0`, `6`, `3.5`, `"cinco"`; comentario válido, vacío, solo espacios y de 501 caracteres; `createReviewInputSchema`; `updateReviewInputSchema` acepta un campo y rechaza cuerpo vacío ("No hay cambios para guardar."); `reviewListSchema` con y sin reseñas y `promedioRating` `null`. *(Verifica RF-5)*
  - `logic/reviewFormat.test.ts`: `findOwnReview` con/sin coincidencia; `formatAverageRating` con `null`, entero y decimal; `averageStars` con borde 0 y 5. *(Verifica RF-6)*
- **Backend (supertest + `mongodb-memory-server`):** en `routes/reviewsRoutes.test.ts`, con helpers de `test/productFixtures.ts` más un `createReview` de prueba:
  - `GET` público: `200` con `{ reviews, total, promedioRating }` ordenado de más reciente; autor sin `email`; sin reseñas → `total 0` y `promedioRating null`; producto inexistente → `404`. *(Verifica RF-1)*
  - `POST`: `201` autenticado; `401` sin sesión; `409` en la segunda reseña del mismo usuario; `404` producto inexistente; `400` rating/comentario inválidos. *(Verifica RF-2, RF-5)*
  - `PUT`: `200` del autor con `updatedAt` cambiado; `403` no-autor; `404` inexistente; `400` cuerpo sin campos. *(Verifica RF-3)*
  - `DELETE`: `204` del autor y el listado recalcula; `403` no-autor; `404` inexistente; tras borrar puede volver a publicar. *(Verifica RF-4)*
- **Presentación (smoke tests, §4):**
  - `logic/reviewApi.test.ts`: respuesta válida → `ok`; `400` con `fieldErrors`; `401`/`403`/`404`/`409` con mensaje; red caída → fallo de conexión (fetch simulado, como `productApi.test.ts`). *(Verifica RF-5)*
  - `logic/useReviews.test.ts`: carga inicial, error y `retry`; recarga tras `addReview`/`removeReview`. *(Verifica RF-6)*
  - `components/ReviewList.test.tsx`: estado vacío, lista con reseñas, aviso para anónimo, formulario para autenticado sin reseña y propia con "Editar"/"Borrar". *(Verifica RF-6)*
- **Verificación de contrato por QA (manual):**
  - Publicar, editar y borrar una reseña y ver el resumen actualizarse; intentar reseñar dos veces; sin sesión ver el aviso; recargar el detalle; 360 px; recorrer el selector de estrellas solo con teclado.
- **Ausencia de red / mocking:** rutas con `mongodb-memory-server`; frontend con `fetch` simulado.
- **Comando de cierre:** `npm run check` de raíz (`tsc --noEmit` + Vitest en los tres workspaces) en verde.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `model/Review` + `listProductReviews` (tope 20, promedio, populate de autor) | RF-1 |
| Índice único `{product, author}` + `createReview` (404/409) | RF-2 |
| `updateReview` + `assertReviewAuthor` (404/403) | RF-3 |
| `deleteReview` + recálculo del resumen | RF-4 |
| `reviewSchemas.ts` + validación en controlador/cliente (400 en español) | RF-5 |
| `reviewApi`, `reviewFormat`, `useReviews`, `StarRatingInput/Display`, `ReviewList/Card/Form`, `ConfirmDeleteDialog` y sección en `ProductDetailPage` | RF-6 |
| Tests de esquemas, rutas y presentación | Verificación RF-1 a RF-6 (§4) |

---
*Nota:* La spec no deja dudas abiertas (la de "vista nueva" quedó resuelta: las reseñas van como sección del detalle, sin ruta propia). El plan asume los valores revisables de la spec (tope 20, comentario requerido de 1–500, `promedioRating` null sin reseñas). El siguiente paso según el flujo es generar `specs/010-product-reviews/tasks.md`.
