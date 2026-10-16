# Spec 010 — Reseñas de productos

## Contexto y objetivo

Las specs 005 y 008 dejaron la tienda con autenticación real (JWT en cookie httpOnly) y un catálogo de productos en MongoDB cuyo detalle muestra imagen, nombre, categoría, descripción, precio, stock y vendedor, pero **no existe forma de evaluar un producto**: no hay modelo `Review`, ni endpoints de reseñas, ni esquemas Zod de reseñas, ni sección en la página de detalle.

Esta spec agrega **reseñas de productos**: cada producto muestra las reseñas publicadas con su resumen (cantidad y promedio de estrellas), y un usuario autenticado puede publicar, editar y borrar **una** reseña por producto, compuesta por un **rating entero de 1 a 5 estrellas** y un **comentario**. La escritura exige sesión (rutas protegidas en frontend y backend, 005); la lectura es pública. Es una feature **[HITO2-CORE]**: debe funcionar de punta a punta contra el backend real (Express + Mongoose + MongoDB) en la demo.

**Sin moderación en esta fase**: las reseñas se publican directamente al crearlas. No hay estados de aprobación, ni rol de administrador, ni panel de moderación; queda explícitamente fuera de alcance y reservado para una futura spec.

Delta explícito sobre specs previas: esta spec **no modifica** los RF de 005 ni de 008; agrega una sección nueva a la página de detalle (002/RF-2) sin alterar su contenido actual ni su contrato de producto.

## Usuarios

- **Comprador autenticado**: persona con sesión activa que quiere evaluar un producto que compró o probó, corregir su opinión más adelante o retirarla.
- **Visitante**: persona sin sesión que lee las reseñas y el resumen de un producto para tomar una decisión de compra; al intentar escribir se le invita a iniciar sesión.
- **Desarrollador /s**: (implícito) quien implementa la feature; requiere esquemas Zod compartidos, contrato de endpoints claro, middleware de auth reutilizado y tests de rutas y de UI.

## Historias de usuario

- Como visitante, quiero leer las reseñas y el promedio de estrellas de un producto, para decidir con más información antes de comprar.
- Como comprador autenticado, quiero publicar una reseña con estrellas y comentario, para compartir mi experiencia con otros usuarios.
- Como comprador autenticado, quiero editar o borrar mi propia reseña, para corregir un error o retirar una opinión que ya no sostengo.
- Como visitante, quiero que al intentar reseñar se me invite a iniciar sesión, para no perder lo que estaba escribiendo sin motivo.
- Como comprador, quiero ver claramente cuál reseña es mía y poder modificarla ahí mismo, para no tener que ir a otra página.

## Requisitos funcionales

**RF-1 — Listado público de reseñas con resumen.**
Cuando un usuario acceda al detalle de un producto, el sistema deberá ofrecer, mediante una petición pública, la lista de sus reseñas ordenadas de más recientes a más antiguas junto con el total de reseñas y el promedio de rating.
Criterios de aceptación:
- Cuando se consulte `GET /api/products/:id/reviews` con un producto existente, deberá responderse `200` con la forma `{ reviews, total, promedioRating }`, donde `total` es el número de reseñas y `reviews` está ordenado por `createdAt` descendente.
- Cuando `total` sea `0`, `promedioRating` deberá ser `null` y `reviews` deberá ser un arreglo vacío.
- Cuando exista al menos una reseña, `promedioRating` deberá ser el promedio aritmético de los ratings, redondeado a dos decimales como máximo.
- Cuando el producto tenga más reseñas que el tope permitido, `reviews` deberá contener solo las 20 más recientes y `total` deberá reflejar el conteo real completo.
- Cuando se devuelva una reseña, el autor deberá exponerse con la forma `{ id, username, displayName }` y no deberá exponerse en ningún caso el correo del autor ni su contraseña.
- Cuando el producto consultado no exista, deberá responderse `404` con mensaje en español.
- Cuando el producto exista pero no tenga reseñas, no deberá responderse error.

**RF-2 — Publicar reseña (solo autenticado, una por usuario).**
Cuando un usuario con sesión active el control de reseñar y envíe un rating y un comentario válidos, el sistema deberá crear su reseña para ese producto; si ya reseñó ese producto, no deberá permitirse una segunda.
Criterios de aceptación:
- Cuando un usuario autenticado envíe una reseña válida a `POST /api/products/:id/reviews`, deberá responderse `201` con la reseña creada (incluyendo su `id` y fechas) y esta deberá aparecer en el listado (RF-1).
- Cuando el usuario no tenga sesión válida, deberá responderse `401` con mensaje en español.
- Cuando el usuario ya tenga una reseña para ese producto, deberá responderse `409` con mensaje en español y no deberá crearse ninguna reseña adicional.
- Cuando el producto no exista, deberá responderse `404` con mensaje en español.
- Cuando el envío falle por `409` (RF-2) o por validación (RF-5), no deberá perderse el texto que el usuario estaba escribiendo en el formulario.

**RF-3 — Editar reseña propia.**
Cuando un usuario autenticado modifique el rating o el comentario de su propia reseña, el sistema deberá actualizarla; quien no sea el autor no deberá poder editarla.
Criterios de aceptación:
- Cuando el autor edite su reseña con datos válidos vía `PUT /api/reviews/:id`, deberá responderse `200` con la reseña actualizada (su `updatedAt` deberá reflejar el cambio) y el listado deberá mostrar la nueva versión.
- Cuando un usuario autenticado intente editar la reseña de otro usuario, deberá responderse `403` con mensaje en español y la reseña no deberá modificarse.
- Cuando la reseña no exista, deberá responderse `404` con mensaje en español.
- Cuando no se envíe ningún cambio respecto de la reseña actual, deberá responderse `400` con mensaje en español, en línea con 008 ("No hay cambios para guardar.").

**RF-4 — Borrar reseña propia.**
Cuando un usuario autenticado elimine su propia reseña, el sistema deberá borrarla definitivamente; quien no sea el autor no deberá poder borrarla.
Criterios de aceptación:
- Cuando el autor borre su reseña vía `DELETE /api/reviews/:id`, deberá responderse `204` y la reseña no deberá aparecer en el listado; `total` y `promedioRating` deberán recalcularse.
- Cuando un usuario autenticado intente borrar la reseña de otro usuario, deberá responderse `403` con mensaje en español y la reseña no deberá eliminarse.
- Cuando la reseña no exista, deberá responderse `404` con mensaje en español.
- Cuando el usuario borre su única reseña de un producto, deberá poder volver a publicar una nueva (RF-2).

**RF-5 — Validación de los datos de la reseña.**
El sistema deberá validar toda entrada de creación y edición de reseñas con los esquemas Zod compartidos, respondiendo `400` en español ante datos inválidos.
Criterios de aceptación:
- Cuando el rating no sea un entero entre 1 y 5 (p. ej. `0`, `6`, `3.5` o `"cinco"`), deberá responderse `400` con mensaje en español.
- Cuando el comentario esté vacío o contenga solo espacios, deberá responderse `400` con mensaje en español.
- Cuando el comentario supere los 500 caracteres, deberá responderse `400` con mensaje en español.
- Cuando la respuesta sea `400` por validación, deberá incluir los errores por campo en español, en línea con el errorHandler existente.

**RF-6 — Sección de reseñas en la página de detalle.**
Mientras un usuario visualice la página de detalle de un producto, el sistema deberá mostrar una sección de reseñas con el resumen, la lista, y los controles de escritura correspondientes a su estado de sesión.
Criterios de aceptación:
- Cuando la página de detalle cargue, deberá mostrarse la sección de reseñas con el total y el promedio (o su estado vacío) sin alterar el contenido ya existente del detalle (002/RF-2).
- Cuando no haya reseñas, deberá mostrarse el mensaje "Sé el primero en reseñar este producto.".
- Cuando el usuario esté autenticado y no haya reseñado, deberá mostrarse el control "Escribir reseña" que abre un formulario con selector de estrellas y campo de comentario; al publicar correctamente, la reseña deberá aparecer en la lista sin recargar el sitio.
- Cuando el usuario esté autenticado y ya haya reseñado, en lugar del formulario deberá mostrarse su reseña identificada como propia, con controles "Editar" y "Borrar"; editar reutiliza el mismo formulario precargado, y borrar pide confirmación antes de eliminar.
- Cuando el usuario no tenga sesión, deberá mostrarse un aviso en español que lo invite a iniciar sesión para reseñar, en lugar del formulario.
- Cuando se esté cargando el listado, deberá mostrarse un estado de carga; cuando la carga falle, deberá mostrarse un mensaje de error en español con un control para reintentar.
- Cuando el usuario envíe el formulario con datos inválidos (RF-5), deberá verse el error en español sin perder lo escrito.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final deberá estar en español (constitución, §6); identificadores y nombres de código en inglés.
- **RNF-2 Backend real y separación de capas.** La lectura y escritura de reseñas deberá realizarse contra el backend Express + Mongoose (feature HITO2-CORE), con toda la lógica en `services/` y funciones puras testeables en `src/logic/` del frontend; los componentes React solo deberán presentar (constitución, §3).
- **RNF-3 Accesibilidad.** El selector de estrellas deberá ser un grupo de radios operable por teclado con nombre accesible; la lista de reseñas deberá usar estructura de lista semántica; los controles de editar/borrar deberán ser alcanzables y enfocables; los estados de carga/error deberán anunciarse.
- **RNF-4 Responsividad.** La sección de reseñas deberá apilarse correctamente en móvil (desde 360 px) sin romper el layout del detalle.
- **RNF-5 Tests.** Los esquemas Zod, las rutas (supertest + mongodb-memory-server) y la lógica de frontend deberán tener tests; `npm run check` deberá pasar antes de dar por terminada la tarea (constitución, §4).
- **RNF-6 Sin dependencias nuevas.** No se deberán agregar dependencias fuera del stack definido (constitución, §1); se reutilizarán `ConfirmDeleteDialog`, `TextField` y los tokens del design system (`specs/00-design-system/spec.md`, obligatorio antes de tocar UI).
- **RNF-7 Privacidad del autor.** El contrato público de una reseña no deberá exponer nunca el correo, el passwordHash ni datos internos del autor; solo `{ id, username, displayName }`.

## Casos límite

- Producto sin reseñas: el listado responde vacío con `total: 0` y `promedioRating: null`; la UI muestra el estado vacío (RF-1, RF-6).
- Producto inexistente al consultar o crear reseñas: `404` en español (RF-1, RF-2).
- Mismo usuario intentando reseñar dos veces el mismo producto: `409`, sin creación parcial (RF-2); el índice único de persistencia lo garantiza incluso ante doble clic simultáneo.
- Doble clic rápido en "Publicar": no se duplica la reseña (RF-2); la UI evita el reenvío mientras está en curso.
- Rating `0`, `6`, `3.5`, `"cinco"` o negativo: `400` (RF-5).
- Comentario vacío, solo espacios o de 501+ caracteres: `400` (RF-5).
- Edición sin cambios: `400` "No hay cambios para guardar.", consistente con 008 (RF-3).
- Usuario editando o borrando la reseña de otro: `403` y sin efecto (RF-3, RF-4).
- Reseña inexistente al editar o borrar: `404` (RF-3, RF-4).
- Sesión expirada o cookie inválida al reseñar: `401` y el formulario conserva lo escrito (RF-2, RF-5).
- Comentario con HTML, scripts, emojis o caracteres especiales: se mostrará como texto literal, sin interpretación de marcado (RF-6).
- Producto con decenas de reseñas: se muestran las 20 más recientes; `total` y `promedioRating` consideran todas (RF-1).
- Usuario que borra su reseña: desaparece de la lista, el resumen se recalcula y puede volver a reseñar (RF-4).
- Visitante en el detalle: lee listado y resumen, no ve formulario y ve el aviso de sesión (RF-6).
- Recarga o acceso directo a `#/producto/:id`: la sección de reseñas se carga igual (hereda RF-5 de 002).

## Fuera de alcance

- Moderación de reseñas: estados pendiente/rechazada/publicada, rol de administrador, panel de moderación y endpoints de admin (reservado para futura spec).
- Edición o borrado de reseñas por parte de administradores.
- Paginación, "cargar más" u orden configurable de reseñas (tope fijo de 20 más recientes).
- Mostrar el promedio o el total de reseñas en `ProductCard`, en el catálogo o en el inicio (solo en la sección de detalle).
- Persistir el promedio o el contador en el modelo `Product` (se calcula en el endpoint de reseñas; el contrato de producto de 008 no cambia).
- Fotos, videos o imágenes adjuntas en reseñas; respuestas del vendedor; marcas "útil"; likes.
- Notificaciones por nuevas reseñas o respuestas.
- Vista "mis reseñas" en el perfil (006/007 no se modifican).
- Filtros de reseñas (por rating, por fecha) o búsqueda dentro de reseñas.
- Cambios al modelo `User` (sin campo de rol) y a la autenticación de 005.

## Criterios de finalización

Esta tarea se considera terminada cuando:
1. `GET /api/products/:id/reviews` responde públicamente `{ reviews, total, promedioRating }` ordenado de más recientes, con tope de 20, `promedioRating` null sin reseñas, y sin exponer datos privados del autor (RF-1).
2. Un usuario autenticado puede publicar una reseña válida (`201`); una segunda reseña del mismo usuario en el mismo producto responde `409`; sin sesión responde `401`; producto inexistente `404` (RF-2).
3. El autor puede editar (`200`) y borrar (`204`) su reseña; no autor recibe `403`; inexistente `404`; edición sin cambios `400` (RF-3, RF-4).
4. Datos inválidos de rating y comentario responden `400` en español con errores por campo (RF-5).
5. La página de detalle muestra la sección de reseñas con estados de carga, error, vacío, lista, formulario (autenticado), aviso de sesión (anónimo), edición y borrado con confirmación, sin alterar el contenido existente del detalle (RF-6).
6. El selector de estrellas es operable por teclado como grupo de radios con nombre accesible (RNF-3).
7. Los esquemas de reseñas viven en `@tiendadcc/utils` con mensajes en español (RF-5, RNF-1).
8. Los tests de esquemas, rutas y lógica de frontend pasan (RNF-5).
9. `npm run check` pasa sin errores.

## Dudas abiertas

- [RESUELTO] Alcance HITO2-CORE: la feature se implementa completa contra backend real (no mock), por decisión del equipo.
- [RESUELTO] Sin moderación: las reseñas se publican directamente al crearlas; estados de aprobación y rol de administrador quedan para una futura spec.
- [RESUELTO] Una reseña por usuario por producto, editable y borrable por su autor, garantizada con índice único compuesto `{ product, author }`.
- [RESUELTO] Rating entero de 1 a 5 estrellas y comentario requerido de 1 a 500 caracteres (requerido: una reseña sin opinión escrita no aporta; se revisará si la comunidad lo pide).
- [RESUELTO] El endpoint público responde `{ reviews, total, promedioRating }`, con `promedioRating` null cuando no hay reseñas; el promedio se calcula en el servidor y no se persiste en `Product`.
- [RESUELTO] Sin paginación: `MAX_REVIEWS_LIMIT = 20` reseñas más recientes; el total refleja el conteo completo. Si el catálogo crece, se ampliará en spec propia.
- [RESUELTO] El autor se expone como `{ id, username, displayName }` (mismo patrón que `productSellerSchema` de 008), nunca correo ni hash.
- [RESUELTO] El formulario vive dentro de la sección del detalle, abierto por el control "Escribir reseña"; la edición reutiliza el mismo formulario precargado y el borrado usa `ConfirmDeleteDialog` existente.
- [RESUELTO] Editar sin cambios responde `400` con el mismo mensaje de 008 por consistencia.
- [RESUELTO] El promedio y el total se muestran solo en la sección de detalle; `ProductCard` y catálogo no cambian.
- [RESUELTO] Las reseñas no cuentan como una de las "dos vistas nuevas completas" del Hito 2: la sección va integrada en la página de detalle, sin ruta propia ni ancla adicional. La feature mantiene igualmente su alcance HITO2-CORE contra el backend real.
