# Tasks 010 — Reseñas de productos

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 010 del detalle y los patrones reutilizables**
    RF: RF-1…RF-6 (base para todo)
    Hecho cuando: conozco `productsRoutes`/`productsController` (helpers `requireUserId`/`productIdParam`, orden 401 → 404 → 403 → 400), `productService` (`isObjectIdString`, `assertProductOwner`, `findPublicProduct`), `models/Product.ts` (`toPublicProduct`, `populate("seller", "username displayName")`), `errors.ts`/`errorHandler` (`ConflictError`, `ForbiddenError`, `NotFoundError`, `fieldErrors`), `productApi.ts`/`useProduct`, `ProductDetailPage.tsx` (punto de integración), `ConfirmDeleteDialog`/`TextField`/`ui/textarea`, el design system (`specs/00-design-system/spec.md`) y dónde aterriza cada módulo del plan.

## Fase 1 — utils: esquemas de reseñas (depende de 1)

- [x] **2. Esquemas Zod de reseñas en `@tiendadcc/utils`**
    RF: RF-1, RF-5
    Hecho cuando: `utils/src/reviewSchemas.ts` exporta `RATING_MIN`/`RATING_MAX`/`COMMENT_MAX_LENGTH`/`MAX_REVIEWS_LIMIT`, `ratingField` (entero 1–5), `commentField` (trim, 1–500), `reviewAuthorSchema`, `reviewSchema`, `createReviewInputSchema`, `updateReviewInputSchema` (parcial; sin campos → "No hay cambios para guardar."), `reviewListSchema` y sus tipos, reexportados desde `index.ts`, y sus tests (rating `0`/`6`/`3.5`/`"cinco"`, comentario vacío/solo espacios/501, listado con `promedioRating` `null`, edición sin campos) pasan.

## Fase 2 — backend: modelo, servicio y rutas (depende de 2)

- [x] **3. Modelo `Review` y serialización pública**
    RF: RF-1, RF-2
    Hecho cuando: `models/Review.ts` define `product` y `author` (refs `Product`/`User`, indexadas), `rating`, `comment` y `timestamps`, crea el índice único `{ product: 1, author: 1 }` y el índice de listado `{ product: 1, createdAt: -1, _id: -1 }`, y `toPublicReview` serializa `{ id, productId, author: { id, username, displayName }, rating, comment, createdAt, updatedAt }` sin correo ni hash, y `npm run check -w backend` compila.

- [x] **4. Servicio de reseñas: listado con resumen**
    RF: RF-1
    Hecho cuando: `reviewService.listProductReviews` valida el id y la existencia del producto (`404` "Producto no encontrado."), cuenta `total`, calcula `promedioRating` (`null` sin reseñas, redondeado a 2 decimales) y trae hasta `MAX_REVIEWS_LIMIT` reseñas ordenadas `{ createdAt: -1, _id: -1 }` con `populate("author", "username displayName")`, y sus tests (vacío, orden, tope 20 con total real, promedio) pasan.

- [x] **5. Servicio de reseñas: creación, edición y borrado**
    RF: RF-2, RF-3, RF-4
    Hecho cuando: `createReview` verifica el producto (`404`) y traduce la clave duplicada `11000` a `ConflictError("Ya has reseñado este producto.")`; `updateReview` y `deleteReview` verifican existencia (`404` "Reseña no encontrada.") y autoría (`403` "No puedes modificar una reseña de otro usuario.") antes de aplicar `$set`/borrar, y sus tests (crear, duplicado `409`, editar, borrar, `403`, `404`) pasan.

- [x] **6. Controlador y rutas de reseñas**
    RF: RF-1, RF-2, RF-3, RF-4, RF-5
    Hecho cuando: `reviewsController` parsea con los esquemas de `@tiendadcc/utils` (`400` con `fieldErrors` en español) y responde `200`/`201`/`204`; `reviewsRoutes` monta `GET`/`POST` en un subrouter con `mergeParams` para `/api/products/:id/reviews` (el `POST` con `requireAuth`) y `PUT`/`DELETE /api/reviews/:id` (con `requireAuth`); `productsRoutes` registra el subrouter antes de `/:id`; `app.ts` monta `/api/reviews`; y `npm run check -w backend` compila.

- [x] **7. Tests de rutas de reseñas**
    RF: RF-1, RF-2, RF-3, RF-4, RF-5
    Hecho cuando: con supertest + `mongodb-memory-server` verifico `200` público (orden, `total`, `promedioRating`, autor sin `email`), producto inexistente `404`, `201`/`401`/`409`/`400` en `POST`, `200`/`403`/`404`/`400` en `PUT`, `204`/`403`/`404` en `DELETE` y que tras borrar puedo volver a publicar, y pasa `npm run check -w backend`.

## Fase 3 — cliente API y lógica pura (depende de 2, 6)

- [x] **8. Cliente API `reviewApi.ts`**
    RF: RF-5, RF-6
    Hecho cuando: `reviewApi.ts` expone `fetchReviews`, `createReview`, `updateReview` y `deleteReview` con `credentials: "include"`, validación Zod de la respuesta y resultados discriminados (`message`, `fieldErrors`, `notFound`), y sus tests con `fetch` simulado (`200`/`201`/`204`, `400` con `fieldErrors`, `401`/`403`/`404`/`409`, red caída) pasan.

- [x] **9. Lógica pura de formato `reviewFormat.ts`**
    RF: RF-6
    Hecho cuando: `reviewFormat.ts` implementa `findOwnReview(reviews, userId)`, `formatAverageRating(average)` y `averageStars(average)` (funciones puras) y sus tests (con/sin coincidencia, `null`/entero/decimal, bordes 0 y 5) pasan.

- [x] **10. Hook `useReviews`**
    RF: RF-6
    Hecho cuando: `useReviews` carga `{ reviews, total, promedioRating }` con estados `loading`/`error`/`success` y descarte de respuestas tardías, expone `retry` y `{ addReview, editReview, removeReview }` que recargan el listado al tener éxito, y sus tests (carga, error, `retry`, recarga tras mutación) pasan.

## Fase 4 — UI de la sección de reseñas (depende de 8, 9, 10)

- [x] **11. Primitivas `StarRatingInput` y `StarRatingDisplay`**
    RF: RF-6 (RNF-3)
    Hecho cuando: `StarRatingInput` es un grupo de radios (`fieldset` + `legend`) operable por teclado que anuncia "N de 5 estrellas" y `StarRatingDisplay` muestra las estrellas de solo lectura con `aria-label` "N de 5 estrellas", y sus smoke tests pasan.

- [x] **12. Generalizar `ConfirmDeleteDialog` para reseñas**
    RF: RF-6 (RNF-6)
    Hecho cuando: `ConfirmDeleteDialog` acepta props opcionales (`title`, `description`, `confirmLabel`, `triggerLabel`, `triggerAriaLabel`) conservando por defecto los textos de producto, sus usos actuales (mis publicaciones y edición) siguen pasando sin cambios y `npm run check -w frontend` compila.

- [x] **13. Formulario `ReviewForm`**
    RF: RF-6 (RF-5)
    Hecho cuando: `ReviewForm` combina `StarRatingInput` y el `Textarea` de `ui/` con el patrón de error accesible de `TextField` (`aria-invalid`/`aria-describedby` + `role="alert"`), precarga la reseña en edición, conserva lo escrito ante `400`/`409`, deshabilita el envío mientras está en curso y sus smoke tests pasan.

- [x] **14. `ReviewCard` y `ReviewList`**
    RF: RF-6 (RNF-3, RNF-4)
    Hecho cuando: `ReviewList` muestra el resumen (`total` + promedio o "Sé el primero en reseñar este producto."), el formulario para el autenticado sin reseña, la reseña propia con "Editar"/"Borrar" (confirmando con `ConfirmDeleteDialog`), el aviso para iniciar sesión del anónimo y los estados de carga/error con "Reintentar", apilado sin scroll horizontal desde 360 px, y sus smoke tests pasan.

- [x] **15. Integrar la sección en `ProductDetailPage.tsx`**
    RF: RF-6
    Hecho cuando: `ProductDetailPage` renderiza `<ReviewList productId={product.id} />` bajo el grid sin alterar el contenido existente (imagen, categoría, precio, descripción, vendedor, compra/favoritos), y sus smoke tests existentes siguen pasando.

## Fase 5 — Verificación y cierre (depende de 7, 15)

- [x] **16. Verificación QA según criterios de finalización y accesibilidad**
    RF: RF-1…RF-6, RNF-1…RNF-7
    Hecho cuando: verifico contra MongoDB local publicar, editar y borrar una reseña y ver el resumen recalcularse, el `409` al reseñar dos veces, el aviso sin sesión, el estado vacío, la recarga del detalle, el `403` a un no autor, el `400` por validación y por edición sin cambios, los estados de carga/error con "Reintentar" sin red, el comentario con HTML mostrado como texto, 360 px sin scroll horizontal y el selector de estrellas solo con teclado, con consola limpia.

- [x] **17. Cierre: `npm run check` en verde**
    RF: RNF-5, criterio de finalización 9
    Hecho cuando: `npm run check` de raíz (tipos + tests de los tres workspaces) pasa sin errores y anoto el resultado en la respuesta final.
