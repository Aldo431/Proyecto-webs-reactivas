# Spec 008 — Publicaciones de productos

## Contexto y objetivo

Las specs 001–007 dejaron una tienda con backend real para identidad (005, 007) y cuenta (006): `User` en MongoDB con `username`, `displayName`, `favorites: string[]`, `history: { productId, viewedAt }[]` y `cart: { productId, quantity }[]`, todas rutas bajo `/api/auth` y `/api/users` con sesión por cookie `httpOnly` (`requireAuth`). Pero el **catálogo sigue siendo un archivo estático**: `apps/frontend/client/src/data/products.json` (3 productos con `id` de texto como `"taza-dcc"`) se importa directamente en `productRepository.ts`, `CatalogPage.tsx`, `ProductDetailPage.tsx`, `ProfilePage.tsx` y `CartContext.tsx`, y su esquema Zod (`productSchema`) vive solo en el cliente (`logic/productParse.ts`). No existe modelo, ruta ni esquema de producto en el backend ni en `utils/`. Los guards `OnlyAuthenticatedRoute`/`OnlyAnonymousRoute` están definidos dentro de `App.tsx`.

Esta spec convierte la tienda en un **marketplace**: los usuarios autenticados publican productos para vender subiendo una foto desde su computador, los gestionan (editar y borrar) y el catálogo, el detalle, el inicio, el carrito, los favoritos y el historial pasan a leer del backend (`/api/products`). La imagen se procesa en el navegador (redimensión y compresión con `canvas`) y viaja como data URL base64 dentro del JSON, validada con Zod en ambos lados, **sin servicios externos**. Un script de seed carga los productos actuales de `products.json` a MongoDB.

Se redacta como **delta explícito** sobre 002–007: cada RF indica si es nuevo o qué RF previo modifica (`modifica 00N/RF-x`). Las specs previas quedan congeladas como línea base.

Lo que **NO** incluye: servicios externos de imágenes (S3, Cloudinary, etc.), múltiples imágenes por producto, stock, checkout/pagos, moderación o reportes, roles de administrador, edición de `featured` por usuarios, paginación del listado ni búsqueda por texto.

## Usuarios

- **Vendedor (usuario autenticado)**: persona con sesión que publica productos con foto, precio y categoría, y gestiona sus publicaciones.
- **Comprador (anónimo o autenticado)**: persona que navega inicio, catálogo y detalle, ahora con productos de distintos vendedores, y ve quién publicó cada uno.
- **Comprador móvil**: persona en celular (desde 360 px) que también puede publicar fotos tomadas desde su dispositivo.
- **Desarrollador /s**: (implícito) quien implementa la feature; requiere esquemas Zod compartidos, lógica pura testeable, tests de rutas y un seed reproducible.

## Historias de usuario

- Como vendedor, quiero publicar un producto con nombre, descripción, categoría, precio y una foto de mi computador, para venderlo en la tienda.
- Como vendedor, quiero ver una vista previa de la foto antes de publicar, para confirmar que elegí la correcta.
- Como vendedor, quiero que la foto se ajuste sola de tamaño, para no tener que editarla antes de subirla.
- Como vendedor, quiero ver en español qué campo está mal (incluida la foto), para corregirlo sin adivinar.
- Como vendedor, quiero ver mis publicaciones y editarlas o borrarlas, para mantenerlas al día.
- Como vendedor, quiero que me pidan confirmación antes de borrar, para no perder una publicación por error.
- Como comprador, quiero que el catálogo muestre los productos publicados por la comunidad, para encontrar más opciones.
- Como comprador, quiero ver quién publicó un producto, para saber a quién le compro.
- Como comprador, quiero que mi carrito, favoritos e historial ignoren productos que ya no existen, para no ver errores ni tarjetas rotas.
- Como desarrollador, quiero cargar los productos actuales con un seed, para tener datos de partida reproducibles.

## Requisitos funcionales

**RF-1 — Modelo `Product` y contrato público.**
El sistema deberá persistir los productos en MongoDB con un modelo Mongoose y exponerlos con un contrato público estable. Nuevo; supersede el `id` de texto de `products.json` (001/RF-x, 002, 003).
Criterios de aceptación:
- Cuando se cree un producto, su documento deberá contener `name` (String, requerido, `trim`, 1–80), `description` (String, requerido, `trim`, 1–1000), `category` (String, requerido, enum `PRODUCT_CATEGORIES`), `price` (Number entero, requerido, > 0), `image` (String, requerido), `featured` (Boolean, por defecto `false`), `seller` (`ObjectId` con `ref: "User"`, requerido) y `createdAt`/`updatedAt` (`timestamps`).
- Cuando se defina `PRODUCT_CATEGORIES`, deberá ser exactamente `["Tazas", "Poleras", "Stickers"]` (las categorías actuales del catálogo), exportado desde `@tiendadcc/utils` como única fuente de verdad.
- Cuando el backend responda con un producto, deberá usar el contrato público `{ id, name, description, category, price, image, featured, seller: { id, username, displayName }, createdAt, updatedAt }`, donde `id` es el `_id` de Mongo como string y `createdAt`/`updatedAt` son fechas ISO.
- Cuando se serialice `seller`, no deberá exponer `email`, `passwordHash`, `favorites`, `history`, `cart` ni `__v`.
- Cuando `favorites`, `history` y `cart` de `User` referencien productos, deberán seguir guardando strings (ahora el `_id` como string): el modelo y las rutas de `/api/users` no cambian.

**RF-2 — Esquemas compartidos de producto en `@tiendadcc/utils`.**
El sistema deberá definir los esquemas Zod de producto en `utils/` y usarlos en frontend y backend. Nuevo; mueve `productSchema` desde `apps/frontend/client/src/logic/productParse.ts`.
Criterios de aceptación:
- Cuando se inspeccione `utils/src/productSchemas.ts`, deberá exportar `PRODUCT_CATEGORIES`, `productCategorySchema`, `productImageSchema` (público), `uploadImageSchema` (subida), `productSellerSchema`, `productSchema` (público), `productListSchema`, `createProductInputSchema`, `updateProductInputSchema`, `productListQuerySchema` y sus tipos inferidos, todos reexportados desde `utils/src/index.ts`.
- Cuando se valide `productSchema`, `image` deberá aceptar un data URL válido según RF-3, una ruta absoluta que empiece por `/` (p. ej. `/images/taza-dcc.png`, `/api/products/<id>/image?v=…`) o una URL `http(s)://`; cualquier otro valor deberá rechazarse.
- Cuando se valide `createProductInputSchema`, deberá exigir `name`, `description`, `category`, `price` e `image`, con `image` validada por `uploadImageSchema` (solo data URL, RF-3), y no deberá contener `featured`, `seller`, `id` ni marcas de tiempo.
- Cuando se valide `updateProductInputSchema`, deberá ser la versión parcial de `createProductInputSchema` (todos los campos opcionales, `image` incluida), y deberá rechazar con `400` un cuerpo sin ningún campo reconocido ("No hay cambios para guardar.").
- Cuando el cuerpo incluya campos no reconocidos (`featured`, `seller`, `id`, `isAdmin`…), deberán ignorarse y no asignarse al producto (sin _mass assignment_).
- Cuando se valide `price`, deberá exigirse un número entero mayor que 0 y como máximo 10.000.000 (pesos chilenos), con mensajes en español.
- Cuando el frontend necesite el tipo `Product`, deberá importarlo de `@tiendadcc/utils`; `logic/productParse.ts` deja de definir su propio esquema.

**RF-3 — Validación de la imagen subida.**
El sistema deberá aceptar en creación y edición solo imágenes JPEG, PNG o WebP codificadas como data URL base64 de hasta 1 MB decodificada. Nuevo.
Criterios de aceptación:
- Cuando se valide `uploadImageSchema`, deberá exigir el formato `data:<mime>;base64,<datos>` con `<mime>` ∈ {`image/jpeg`, `image/png`, `image/webp`} y `<datos>` base64 estándar válido.
- Cuando el tipo declarado no sea uno de los tres (p. ej. `image/gif`, `image/svg+xml`, `text/html`), deberá rechazarse con "Formato de imagen no permitido. Usa JPG, PNG o WebP.".
- Cuando el tamaño decodificado supere 1 MB (`MAX_IMAGE_BYTES = 1_048_576`), deberá rechazarse con "La imagen no puede superar 1 MB.".
- Cuando los primeros bytes decodificados no correspondan al tipo declarado (firma JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF….WEBP`), deberá rechazarse con "El archivo no es una imagen válida.".
- Cuando falte la imagen al crear, deberá rechazarse con "La imagen es obligatoria.".
- Cuando el backend reciba una imagen inválida, deberá responder `400` con `fieldErrors.image` en español mediante el `errorHandler` existente (ZodError → 400).

**RF-4 — Límite de tamaño del cuerpo y error `413`.**
El sistema deberá aceptar cuerpos de hasta 2 MB solo donde viajan imágenes y responder `413` en español si se excede. Nuevo; modifica 005 (`app.ts`).
Criterios de aceptación:
- Cuando llegue `POST /api/products` o `PATCH /api/products/:id`, el parser JSON deberá aceptar cuerpos de hasta 2 MB.
- Cuando llegue cualquier otra ruta (`/api/auth`, `/api/users`, …), el límite deberá seguir siendo el por defecto de `express.json()` (100 KB).
- Cuando un cuerpo exceda el límite de su ruta, el `errorHandler` deberá responder `413` con "Los datos enviados superan el tamaño máximo permitido." y no deberá crear ni modificar nada.

**RF-5 — Listado público `GET /api/products` con filtros.**
El sistema deberá listar productos públicamente con filtros combinables y respuesta liviana. Nuevo; reemplaza la lectura de `products.json` (003, home RF-7).
Criterios de aceptación:
- Cuando se llame sin parámetros, deberá responder `200` con un arreglo de productos públicos (RF-1), ordenados del más reciente al más antiguo (`createdAt` desc, desempate por `_id` desc).
- Cuando se pase `?categoria=<Categoría>` con un valor de `PRODUCT_CATEGORIES` (p. ej. `Tazas`), deberá devolver solo esa categoría; con un valor desconocido deberá responder `400` en español.
- Cuando se pase `?featured=true`, deberá devolver solo destacados; `?featured=false` solo no destacados; otro valor deberá responder `400`.
- Cuando se pase `?ids=a,b,c`, deberá devolver solo los productos existentes de esa lista, en el orden pedido y sin duplicados; los ids con formato inválido (p. ej. `"taza-dcc"`) o inexistentes deberán omitirse sin error; `?ids=` vacío deberá devolver `[]`; más de 100 ids deberán responder `400`.
- Cuando se combinen filtros, deberán aplicarse todos (AND).
- Cuando la respuesta incluya un producto cuya imagen se guardó como data URL, el campo `image` no deberá contener el data URL sino la ruta `/api/products/<id>/image?v=<updatedAt en ms>` (RF-6); las rutas existentes (`/images/…`) se devuelven tal cual. Esto aplica a todas las respuestas de producto (listado, `/mine`, `/:id`, `POST`, `PATCH`).
- Cuando se consulte la base de datos para un listado, la proyección no deberá traer el contenido del data URL desde MongoDB.

**RF-6 — Imagen servida `GET /api/products/:id/image`.**
El sistema deberá servir la imagen subida de un producto como binario cacheable. Nuevo (decisión de eficiencia, ver Dudas abiertas).
Criterios de aceptación:
- Cuando el producto exista y su imagen sea un data URL, deberá responder `200` con el binario decodificado, `Content-Type` igual al tipo del data URL, `Cache-Control: public, max-age=31536000, immutable` y `X-Content-Type-Options: nosniff`.
- Cuando el producto exista y su imagen sea una ruta o URL (productos del seed), deberá responder `302` hacia esa ruta.
- Cuando el id sea inválido o el producto no exista, deberá responder `404` en español.
- Cuando la imagen se reemplace en una edición, la nueva URL pública deberá cambiar (`?v=` con el nuevo `updatedAt`) para invalidar la caché del navegador.

**RF-7 — Detalle público `GET /api/products/:id`.**
El sistema deberá devolver un producto por id. Nuevo; reemplaza `getProductById` sobre el JSON (002).
Criterios de aceptación:
- Cuando el producto exista, deberá responder `200` con el producto público (RF-1, imagen según RF-5).
- Cuando el id no sea un `ObjectId` válido o el producto no exista, deberá responder `404` con "Producto no encontrado.".

**RF-8 — Mis publicaciones `GET /api/products/mine`.**
El sistema deberá listar los productos del usuario autenticado. Nuevo.
Criterios de aceptación:
- Cuando no haya sesión, deberá responder `401` ("Debes iniciar sesión.").
- Cuando haya sesión, deberá responder `200` solo con los productos cuyo `seller` sea `req.user.id`, del más reciente al más antiguo, con la misma forma y proyección liviana que RF-5.
- Cuando el usuario no tenga publicaciones, deberá responder `200` con `[]`.
- Cuando se registre la ruta, `/mine` deberá resolverse antes que `/:id`.

**RF-9 — Publicar `POST /api/products`.**
El sistema deberá crear un producto a nombre del usuario autenticado. Nuevo.
Criterios de aceptación:
- Cuando no haya sesión, deberá responder `401` sin crear nada.
- Cuando el cuerpo sea válido según `createProductInputSchema`, deberá crear el producto con `seller = req.user.id` y `featured = false`, y responder `201` con el producto público.
- Cuando el cuerpo incluya `seller` o `featured`, deberán ignorarse (el `seller` siempre se toma de la sesión).
- Cuando el cuerpo sea inválido, deberá responder `400` con `fieldErrors` en español por campo (`name`, `description`, `category`, `price`, `image`) y no deberá crear nada.

**RF-10 — Editar `PATCH /api/products/:id`.**
El sistema deberá permitir al dueño actualizar parcialmente su publicación. Nuevo.
Criterios de aceptación:
- Cuando no haya sesión, deberá responder `401`; cuando el id sea inválido o no exista, `404`; cuando el producto sea de otro usuario, `403` con "No puedes modificar una publicación de otro usuario."; en ese orden de evaluación, y solo después validar el cuerpo (`400`).
- Cuando el dueño envíe campos válidos, deberán actualizarse solo esos campos y responder `200` con el producto público actualizado.
- Cuando no se envíe `image`, deberá conservarse la imagen actual.
- Cuando se envíe `image`, deberá validarse con `uploadImageSchema` (RF-3) y reemplazar la anterior.
- Cuando el cuerpo incluya `featured` o `seller`, deberán ignorarse: `featured` no es editable por usuarios y `seller` nunca cambia.

**RF-11 — Borrar `DELETE /api/products/:id` con limpieza de referencias.**
El sistema deberá permitir al dueño borrar su publicación y limpiar sus referencias en todas las cuentas. Nuevo.
Criterios de aceptación:
- Cuando no haya sesión, deberá responder `401`; id inválido o inexistente, `404`; producto ajeno, `403` (mismo mensaje y orden que RF-10).
- Cuando el dueño lo borre, deberá eliminar el documento y responder `204`.
- Cuando se borre, deberá quitar el id de `favorites`, de `history` (entradas con ese `productId`) y de `cart` (líneas con ese `productId`) de **todos** los usuarios.
- Cuando la limpieza falle tras borrar el producto, el borrado deberá mantenerse (las referencias huérfanas son toleradas por RF-15).

**RF-12 — Seed de productos.**
El sistema deberá ofrecer un script que cargue los productos de `products.json` a MongoDB con un vendedor de prueba. Nuevo.
Criterios de aceptación:
- Cuando se ejecute `npm run seed -w backend`, deberá validar el entorno (`MONGODB_URI`, y `SEED_SELLER_PASSWORD` de al menos 8 caracteres) con Zod y abortar con un mensaje en español si falta.
- Cuando se ejecute, deberá crear (o reutilizar si existe) el usuario vendedor `username: "tiendadcc"`, `displayName: "TiendaDCC"`, `email: "vendedor@tiendadcc.cl"`, con contraseña hasheada igual que en el registro (005).
- Cuando se ejecute, deberá crear cada producto del JSON (validado con Zod) con su `name`, `category`, `price`, `image` (ruta actual, p. ej. `/images/taza-dcc.png`), `description` y `featured`, con `seller` = vendedor de prueba.
- Cuando se ejecute más de una vez, no deberá duplicar productos (upsert por `seller` + `name`) ni usuarios.
- Cuando existan usuarios con referencias a los ids antiguos del JSON (`"taza-dcc"`, …) en `favorites`, `history` o `cart`, el seed deberá reemplazarlas por el nuevo `_id` del producto correspondiente.
- Cuando termine, deberá imprimir en español cuántos productos creó o actualizó y cerrar la conexión.
- Cuando se implemente el seed (fase 3), deberá **copiar** `products.json` a `apps/backend/src/seed/products.json` sin cambiar su formato y sin tocar el archivo del frontend, que el cliente sigue importando hasta la fase 4.
- Cuando termine la fase 4 (RF-14, RF-15) y ningún código ni test del cliente importe `apps/frontend/client/src/data/products.json`, ese archivo deberá eliminarse, de modo que ya no forme parte del bundle; la única copia queda en el backend.

**RF-13 — Cliente de API de productos en el frontend.**
El sistema deberá concentrar el acceso a `/api/products` en `src/logic/productApi.ts`. Nuevo.
Criterios de aceptación:
- Cuando se inspeccione `productApi.ts`, deberá exponer `fetchProducts(filters)`, `fetchProductsByIds(ids)`, `fetchProduct(id)`, `fetchMyProducts()`, `createProduct(input)`, `updateProduct(id, input)` y `deleteProduct(id)`, al estilo de `authApi.ts`/`profileApi.ts`: `credentials: "include"`, respuestas validadas con los esquemas de `@tiendadcc/utils` y resultados discriminados (`ok` | `message` + `fieldErrors?`), sin lanzar excepciones al componente.
- Cuando el backend responda `400`, `401`, `403`, `404` o `413`, el cliente deberá traducirlo a un resultado con mensaje en español (y `fieldErrors` en `400`).
- Cuando `fetchProduct` reciba `404`, deberá devolver un resultado "no encontrado" distinguible del error de red.
- Cuando `fetchProductsByIds` reciba más de 100 ids, deberá partir la consulta en lotes de 100 y concatenar los resultados.
- Cuando la imagen pública sea una ruta `/api/...`, el frontend deberá anteponer `VITE_API_URL` mediante una función pura (`resolveImageUrl`); las rutas `/images/...` se usan tal cual.

**RF-14 — Lectura del catálogo desde la API.**
El sistema deberá leer inicio, catálogo y detalle desde el backend con estados de carga y error. Modifica home RF-7 (fuente de destacados), 003 (catálogo) y 002 (detalle).
Criterios de aceptación:
- Cuando cargue el inicio, `productRepository.ts` deberá obtener los destacados con `GET /api/products?featured=true` (manteniendo `FEATURED_PRODUCT_COUNT` y los estados de carga/error/reintento de home).
- Cuando cargue `/catalogo`, deberá pedir todos los productos una sola vez, mostrar un estado de carga accesible y, ante error, el mensaje "No se pudieron cargar los productos." con "Reintentar".
- Cuando el usuario cambie de categoría en el catálogo, el filtrado deberá ser local e inmediato sobre la lista ya cargada (sin nueva petición), y los filtros deberán salir de `PRODUCT_CATEGORIES` (no de los datos), manteniendo el parámetro `?categoria=<slug>` de la URL.
- Cuando una categoría no tenga productos, deberá mostrarse "No hay productos en esta categoría." (sin cambios).
- Cuando cargue `/producto/:id`, deberá pedir `GET /api/products/:id`: mientras carga, estado de carga; si `404`, el estado "Producto no encontrado" existente (002); si falla la red, mensaje de error con "Reintentar".
- Cuando el detalle muestre un producto, deberá mostrar "Publicado por <displayName>" y, si el usuario autenticado es el dueño, un enlace "Editar publicación" a `/publicaciones/:id/editar` en lugar de "Agregar al carrito" y de favoritos (el dueño gestiona su producto, no lo compra).
- Cuando el detalle registre la visita (006/RF-10), deberá usar el `id` del backend.
- Cuando se busque en `src/` (excluyendo tests), no deberá existir ningún `import` de `products.json`.

**RF-15 — Carrito, favoritos e historial resueltos contra la API.**
El sistema deberá resolver los `productId` guardados contra el backend y descartar sin error los que ya no existan. Modifica 004/RF-7, 006/RF-12, 007/RF-8 y 007/RF-9.
Criterios de aceptación:
- Cuando el carrito se cargue de `localStorage`, deberá mostrarse de inmediato con los datos guardados y luego refrescarse con `fetchProductsByIds`: las líneas cuyo id no exista deberán eliminarse sin aviso de error, y `name`, `price` e `image` deberán actualizarse con los del backend.
- Cuando la fusión o restauración del carrito con la cuenta (006/RF-12) resuelva líneas, deberá hacerlo contra los productos obtenidos con `fetchProductsByIds` de la unión de ids (local + cuenta), no contra un catálogo estático.
- Cuando `fetchProductsByIds` falle por red, el carrito no deberá descartar ninguna línea ni enviar `PUT` con líneas reducidas; deberá reintentar en la siguiente carga.
- Cuando `/perfil` muestre favoritos e historial, deberá resolver sus ids con `fetchProductsByIds` (una sola petición para ambos); los inexistentes deberán ocultarse sin romper la grilla ni el carrusel (como 007/RF-8 y RF-9).
- Cuando `ProductCard` muestre productos, deberá seguir funcionando con el `id` del backend en enlaces, carrito y favoritos.

**RF-16 — Guards de rutas en archivos propios.**
El sistema deberá mover los guards de `App.tsx` a componentes propios reutilizables. Modifica 005/RF-8 y 006/RF-7 (solo ubicación; comportamiento sin cambios).
Criterios de aceptación:
- Cuando se inspeccione `src/components/`, deberán existir `OnlyAuthenticatedRoute.tsx` y `OnlyAnonymousRoute.tsx`, con props tipadas, y `App.tsx` deberá importarlos.
- Cuando la sesión se esté restaurando, ambos deberán no renderizar nada; un anónimo en una ruta protegida deberá ir a `/iniciar-sesion` y un autenticado en `/registro` o `/iniciar-sesion` a `/`.
- Cuando se usen en `/perfil`, `/publicar`, `/mis-publicaciones` y `/publicaciones/:id/editar`, deberán proteger esas rutas.

**RF-17 — Procesamiento de la imagen en el navegador.**
El sistema deberá convertir el archivo elegido en un data URL redimensionado y comprimido mediante lógica separada del componente. Nuevo.
Criterios de aceptación:
- Cuando el usuario elija un archivo, deberá aceptarse solo `image/jpeg`, `image/png` o `image/webp` (por tipo MIME); otro tipo deberá mostrar "Formato de imagen no permitido. Usa JPG, PNG o WebP." sin procesarlo.
- Cuando el archivo original pese más de 10 MB, deberá rechazarse con "La imagen original no puede superar 10 MB." sin procesarlo.
- Cuando se procese, deberá redimensionarse manteniendo la proporción para que su lado mayor sea como máximo 1200 px (sin agrandar imágenes más pequeñas), respetando la orientación EXIF.
- Cuando se codifique, deberá intentar WebP con calidad 0,8 y, si el navegador no soporta WebP en `canvas`, JPEG con calidad 0,8 sobre fondo blanco.
- Cuando el resultado supere 1 MB, deberá reintentar bajando la calidad (0,7 → 0,6 → 0,5) y, si aún excede, mostrar "No pudimos reducir la imagen a 1 MB. Prueba con otra foto.".
- Cuando el archivo no pueda decodificarse, deberá mostrar "No se pudo leer la imagen.".
- Cuando se inspeccione `src/logic/imageProcessing.ts`, deberá contener la lógica como funciones puras testeables (cálculo de dimensiones, estimación de bytes de un data URL, selección de formato, estrategia de calidad y validación de archivo), con el acceso a `canvas`/`createImageBitmap` inyectado para poder testearla sin navegador.

**RF-18 — Página `/publicar`.**
El sistema deberá ofrecer un formulario protegido para publicar un producto. Nuevo.
Criterios de aceptación:
- Cuando un anónimo acceda a `/publicar`, deberá redirigirse a `/iniciar-sesion` (RF-16).
- Cuando se muestre el formulario, deberá tener "Nombre", "Descripción" (área de texto con contador "N/1000"), "Categoría" (selector con `PRODUCT_CATEGORIES`), "Precio (CLP)" (entero, sin puntos ni decimales) e "Imagen" (selector de archivo con `accept="image/jpeg,image/png,image/webp"`), todos con `label` asociado.
- Cuando el usuario elija una imagen válida, deberá mostrarse su vista previa (ya procesada) con texto alternativo "Vista previa de la imagen" y un botón "Cambiar imagen".
- Cuando se procese la imagen, deberá mostrarse "Procesando imagen…" y el botón "Publicar" deberá estar deshabilitado hasta terminar.
- Cuando se envíe con datos inválidos, deberán mostrarse los errores por campo del esquema compartido en español (incluida la imagen: obligatoria, formato no permitido, demasiado grande), el foco deberá ir al primer campo con error y no deberá enviarse la petición.
- Cuando el envío esté en curso, el botón deberá mostrar "Publicando…", deshabilitarse y no permitir doble envío.
- Cuando el backend responda `400`/`413`, deberán mostrarse sus mensajes (por campo o generales) sin perder los datos ingresados ni la imagen elegida.
- Cuando la publicación tenga éxito, deberá navegarse a `/mis-publicaciones` con el aviso "Tu producto se publicó." (`role="status"`).

**RF-19 — Página `/mis-publicaciones`.**
El sistema deberá listar las publicaciones del usuario con acciones de edición y borrado. Nuevo.
Criterios de aceptación:
- Cuando un anónimo acceda, deberá redirigirse a `/iniciar-sesion` (RF-16).
- Cuando cargue, deberá pedir `GET /api/products/mine` con estado de carga y, ante error, mensaje con "Reintentar".
- Cuando haya publicaciones, cada una deberá mostrar imagen, nombre, categoría, precio en CLP (`Intl.NumberFormat('es-CL')`), enlace al detalle, "Editar" (→ `/publicaciones/:id/editar`) y "Eliminar", con `aria-label` que incluya el nombre del producto. La tarjeta es `ProductCard` sin los botones de carrito ni favoritos (prop `showShopActions`).
- Cuando no haya publicaciones, deberá mostrarse "Aún no publicas productos." con el botón "Publicar producto" (→ `/publicar`); el botón también deberá estar visible sobre la lista.
- Cuando se active "Eliminar", deberá abrirse un diálogo de confirmación accesible ("¿Eliminar «<nombre>»? Esta acción no se puede deshacer.", botones "Cancelar" y "Eliminar") con foco atrapado, cierre con `Escape` y retorno del foco al botón que lo abrió.
- Cuando se confirme, deberá llamarse a `DELETE`, deshabilitar el botón mientras tanto, quitar la publicación de la lista al recibir `204` y mostrar "Publicación eliminada."; ante error, mostrar el mensaje en español sin quitarla.
- Cuando se llegue desde `/publicar` o la edición, deberá mostrarse el aviso correspondiente una sola vez.

**RF-20 — Página `/publicaciones/:id/editar`.**
El sistema deberá permitir al dueño editar su publicación con el mismo formulario. Nuevo.
Criterios de aceptación:
- Cuando un anónimo acceda, deberá redirigirse a `/iniciar-sesion` (RF-16).
- Cuando cargue, deberá pedir `GET /api/products/:id` y prellenar el formulario de RF-18 con los datos actuales y la imagen actual como vista previa.
- Cuando el producto no exista, deberá mostrarse "Producto no encontrado." con enlace a "Mis publicaciones"; cuando no sea del usuario, "No puedes editar esta publicación." con el mismo enlace, sin mostrar el formulario.
- Cuando el usuario no elija una imagen nueva, el `PATCH` no deberá incluir `image` (se conserva la actual, RF-10).
- Cuando se guarde, el botón deberá mostrar "Guardando…" y, al tener éxito, navegar a `/mis-publicaciones` con el aviso "Cambios guardados.".
- Cuando el backend responda `400`, `403`, `404` o `413`, deberá mostrarse el mensaje en español sin perder los datos ingresados.

**RF-21 — Acceso a "Mis publicaciones" en el encabezado.**
El sistema deberá ofrecer el acceso a las publicaciones del usuario desde el encabezado. Modifica 006/RF-14 y 007/RF-5.
Criterios de aceptación:
- Cuando haya sesión, el encabezado deberá mostrar el enlace "Mis publicaciones" (→ `/mis-publicaciones`) junto a Catálogo y Favoritos, y también dentro del menú hamburguesa bajo 640 px.
- Cuando no haya sesión, no deberá mostrarse.
- Cuando la ruta activa sea `/mis-publicaciones`, `/publicar` o `/publicaciones/:id/editar`, el enlace deberá exponer `aria-current="page"`.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final en español, incluidos los mensajes de validación de imagen, `413`, `403`, diálogos y avisos (constitución §6). Identificadores en inglés (`Product`, `seller`, `uploadImageSchema`…).
- **RNF-2 Backend real y separación de capas.** Toda lectura y escritura de productos pasa por el modelo Mongoose (constitución §5). Lógica de negocio en `services/productService.ts` (backend) y en funciones/hooks puros de `src/logic/` (frontend); los componentes solo presentan (§3).
- **RNF-3 Seguridad.** `seller` siempre desde `req.user`; propiedad verificada en el servidor (`403`); sin _mass assignment_; SVG y cualquier tipo distinto de JPEG/PNG/WebP rechazados; firma de bytes verificada (RF-3); la imagen servida lleva `Content-Type` del tipo validado y `nosniff`; límites de cuerpo por ruta (RF-4); `seller` sin correo.
- **RNF-4 Eficiencia.** Las respuestas de producto nunca incluyen el data URL (RF-5): los listados proyectan sin la imagen pesada y las imágenes se sirven aparte con caché inmutable versionada (RF-6). Las imágenes de tarjetas usan `loading="lazy"` y `decoding="async"`. El catálogo se pide una vez y se filtra localmente.
- **RNF-5 Dependencias.** Sin dependencias npm nuevas. Redimensión con APIs nativas (`createImageBitmap`, `canvas`), decodificación con `Buffer`/`atob`, seed ejecutado con `node` (como `npm run dev -w backend`). Modifica 00/RF-9: se suman las primitivas de shadcn/ui `textarea` y `alert-dialog` (código copiado; `alert-dialog` usa `radix-ui`, ya sancionado en 00/RNF-6). El selector de categoría es un `<select>` nativo con los estilos de `Input`.
- **RNF-6 Sistema de diseño "IDE institucional".** Tokens semánticos, `font-mono` en títulos y precios, `font-sans` en formulario y descripciones, primitivas `Button`/`Input`/`Label`/`Card`/`Badge`/`Textarea`/`AlertDialog`, errores en `destructive` con texto, foco con `ring`, sin animaciones en formularios ni al filtrar (00/RF-7).
- **RNF-7 Accesibilidad.** Campos con `label`, `aria-invalid` y `aria-describedby`; errores en `role="alert"`; avisos de éxito en `role="status"`; estados de carga anunciados (`aria-busy` o texto); diálogo de confirmación con foco atrapado y retorno; vista previa con `alt`; nada depende solo del color; operable por teclado; contraste AA.
- **RNF-8 Responsividad.** Desde 360 px sin desplazamiento horizontal: formulario en una columna, vista previa con ancho máximo del contenedor, lista de "Mis publicaciones" de 1 columna en móvil y 2–3 desde `sm`/`lg`, encabezado con hamburguesa (007/RF-5).
- **RNF-9 Tests.** Lógica de negocio con tests (constitución §4): esquemas de `utils` (imagen válida e inválida: tipo, tamaño, base64, firma; create/update/query); rutas con supertest + `mongodb-memory-server` (`401`, `403`, `404`, `400` incluidas imagen con tipo inválido y demasiado grande, `413`, filtros `categoria`/`featured`/`ids`, proyección sin data URL, imagen servida, limpieza de favoritos/historial/carrito al borrar, seed idempotente); frontend (`imageProcessing`, `productApi`, `resolveImageUrl`, resolución del carrito por ids, guards, y smoke de `/publicar`, `/mis-publicaciones`, edición, catálogo y detalle). `npm run check` de raíz verifica todo.

## Casos límite

- Imagen con extensión `.jpg` pero contenido PNG: el navegador la re-codifica (RF-17); en el backend la firma debe coincidir con el tipo declarado (RF-3).
- Data URL con tipo `image/svg+xml` o `text/html` enviado directo a la API: `400` (RF-3).
- Data URL de exactamente 1 MB decodificado: aceptado; 1 MB + 1 byte: `400` (RF-3).
- Base64 corrupto o sin prefijo `data:`: `400` "El archivo no es una imagen válida." o "Formato de imagen no permitido." (RF-3).
- Cuerpo de 3 MB en `POST /api/products`: `413` en español (RF-4). Cuerpo de 200 KB en `/api/auth/login`: `413` (RF-4).
- Foto de 4000×3000 px: queda en 1200×900; foto de 800×600: no se agranda (RF-17).
- PNG con transparencia y navegador sin WebP: se codifica JPEG sobre fondo blanco (RF-17).
- Foto muy detallada que no baja de 1 MB ni con calidad 0,5: mensaje de error y no se envía (RF-17).
- `PATCH` sin `image`: se conserva la actual; `PATCH` con cuerpo vacío o solo campos desconocidos: `400` (RF-2, RF-10).
- `PATCH`/`DELETE` con `featured: true` o `seller` ajeno en el cuerpo: se ignoran (RF-10).
- Otro usuario intenta editar o borrar: `403` sin cambios (RF-10, RF-11).
- `GET /api/products/taza-dcc` (id antiguo): `404` (RF-7).
- `?ids=taza-dcc,<id válido>`: devuelve solo el válido existente (RF-5).
- Producto borrado que estaba en el carrito, favoritos e historial de varios usuarios: se limpia en todas las cuentas; si una pestaña ya abierta lo tiene en `localStorage`, se descarta al refrescar por ids (RF-11, RF-15).
- API caída al abrir la app con carrito local: el carrito se muestra con los datos guardados y no se descarta nada (RF-15).
- Precio editado por el vendedor con el producto en carritos: al refrescar, el carrito muestra el nuevo precio (RF-15).
- Dos pestañas: una borra el producto mientras la otra edita: el `PATCH` responde `404` y se muestra "Producto no encontrado." (RF-20).
- Seed ejecutado dos veces: no duplica productos ni el vendedor (RF-12).
- Usuarios previos con `"taza-dcc"` en favoritos: el seed los remapea al nuevo `_id`; si no se ejecuta el seed, se ocultan sin error (RF-12, RF-15).
- Nombre de 81 caracteres, descripción de 1001, precio `0`, `-1`, `1.5` o `"abc"`: rechazados en frontend y backend (RF-2).
- Categoría fuera del enum (`"Gorras"`): `400` (RF-2, RF-5).
- Doble clic en "Publicar" o "Eliminar": solo una petición (RF-18, RF-19).
- Sesión vencida mientras se edita: el `PATCH` responde `401` y se muestra "Debes iniciar sesión." sin perder datos (RF-13, RF-20).

## Fuera de alcance

- Servicios externos de imágenes (S3, Cloudinary, Firebase Storage) y almacenamiento en disco del servidor o GridFS.
- Múltiples imágenes por producto, recorte manual o filtros de imagen.
- Stock, variantes (tallas, colores), checkout, pagos y pedidos.
- Moderación, reportes, roles de administrador y edición de `featured` desde la UI.
- Paginación del listado, búsqueda por texto, ordenamientos alternativos y filtro por vendedor.
- Perfil público del vendedor y mensajería comprador–vendedor.
- Borrado en cascada al eliminar cuentas (no existe eliminación de cuentas).
- Corrección del modo oscuro en botones (diferido desde 007).

## Criterios de finalización

Esta tarea se considera terminada cuando:

1. Existe el modelo `Product` con los campos, límites y `seller` de RF-1, y su contrato público no expone datos privados del vendedor (RF-1).
2. Los esquemas de producto, imagen, creación, edición, consulta y categorías viven en `@tiendadcc/utils` y se usan en frontend y backend (RF-2).
3. La API rechaza con `400` en español imágenes con tipo no permitido, firma incorrecta o más de 1 MB, y con `413` los cuerpos sobre el límite sin afectar el límite del resto de la API (RF-3, RF-4).
4. `GET /api/products` filtra por `categoria`, `featured` e `ids`, nunca devuelve data URLs y las imágenes se sirven desde `GET /api/products/:id/image` con caché versionada (RF-5, RF-6).
5. `GET /:id` (`404` correcto), `GET /mine` (`401`), `POST` (`201`), `PATCH` y `DELETE` (`401`/`403`/`404`) cumplen RF-7–RF-11, y el borrado limpia favoritos, historial y carrito de todos los usuarios.
6. `npm run seed -w backend` carga los productos del JSON con un vendedor de prueba, conserva sus imágenes, es idempotente y remapea los ids antiguos (RF-12).
7. `productApi.ts` concentra el acceso a la API con validación Zod y resultados discriminados (RF-13).
8. Inicio, catálogo, detalle, carrito, favoritos e historial leen del backend, descartan ids inexistentes sin error y ningún código de `src/` importa `products.json` (RF-14, RF-15).
9. Los guards viven en archivos propios y protegen `/perfil`, `/publicar`, `/mis-publicaciones` y `/publicaciones/:id/editar` (RF-16).
10. La imagen se valida, redimensiona a ≤1200 px, comprime y convierte a data URL con lógica pura testeada en `src/logic/imageProcessing.ts` (RF-17).
11. `/publicar`, `/mis-publicaciones` (con confirmación de borrado) y `/publicaciones/:id/editar` funcionan con vista previa, errores por campo, estados de carga y avisos en español (RF-18–RF-20).
12. El encabezado ofrece "Mis publicaciones" con sesión, también en la hamburguesa (RF-21).
13. Existen los tests de RNF-9 y la UI cumple diseño, accesibilidad y responsividad (RNF-6–RNF-8).
14. `npm run check` pasa sin errores.

## Fases de implementación

Cada fase cierra con `npm run check` en verde; el detalle está en `plan.md` y `tasks.md`.

1. **utils** — esquemas de producto, imagen, consulta y categorías con sus tests.
2. **backend** — modelo, servicio, rutas `/api/products`, imagen servida, límites de cuerpo y `413`, con tests de rutas.
3. **seed** — script idempotente, vendedor de prueba, remapeo de ids antiguos y copia de `products.json` al backend (el original del frontend se elimina en la fase 4).
4. **frontend lectura** — `productApi`, `resolveImageUrl`, inicio/catálogo/detalle, carrito/favoritos/historial por ids, sin imports de `products.json` y eliminación del archivo del frontend.
5. **frontend publicar** — guards en archivos propios, `imageProcessing`, formulario compartido y `/publicar`.
6. **frontend gestionar** — `/mis-publicaciones` con borrado confirmado, edición y acceso en el encabezado.

## Dudas abiertas

- [RESUELTO] Número de spec: **008** (siguiente libre tras 007).
- [RESUELTO] Id público: `_id` de Mongo como string; `favorites`, `history` y `cart` de `User` no cambian de tipo (siguen siendo strings).
- [RESUELTO] Imágenes como data URL base64 dentro del JSON, procesadas en el navegador (≤1200 px, WebP/JPEG ~0,8) y validadas en el backend (JPEG/PNG/WebP, ≤1 MB decodificada), sin servicios externos.
- [RESUELTO — decisión de esta spec, revisar] **Eficiencia del listado.** Se evaluaron tres opciones: (a) devolver el data URL en todas las respuestas confiando en el límite de 1 MB; (b) excluir `image` del listado; (c) guardar el data URL en el documento pero **no devolverlo nunca**, sirviéndolo como binario en `GET /api/products/:id/image` y exponiendo en `image` la ruta versionada `/api/products/<id>/image?v=<updatedAt>`. Se elige **(c)**: con (a) un catálogo de 30 publicaciones de ~300 KB pesaría ~12 MB de JSON sin caché posible; con (b) las tarjetas quedarían sin imagen. (c) mantiene el modelo (`image: String`), permite caché HTTP inmutable y `loading="lazy"`, y el esquema público sigue aceptando data URL o ruta/URL como se pidió (en la práctica las respuestas solo traen rutas). Agrega un endpoint no listado originalmente (RF-6).
- [RESUELTO — decisión de esta spec, revisar] Tope de precio de **10.000.000 CLP** para evitar valores absurdos o no representables; reversible si se prefiere solo "> 0".
- [RESUELTO — decisión de esta spec, revisar] `?categoria=` de la API recibe el **nombre exacto** de la categoría (`Tazas`), validado contra el enum; el slug (`tazas`) sigue siendo solo de la URL del catálogo en el frontend, que filtra localmente.
- [RESUELTO — decisión de esta spec, revisar] Tras publicar o editar se navega a `/mis-publicaciones` con aviso; el acceso del encabezado es "Mis publicaciones" (desde ahí, "Publicar producto").
- [RESUELTO — decisión de esta spec, revisar] El seed remapea los ids antiguos (`"taza-dcc"`) en cuentas existentes; sin seed, esos ids se ocultan sin error.
- [RESUELTO — decisión de esta spec, revisar] Credenciales del vendedor de prueba: correo fijo `vendedor@tiendadcc.cl` y contraseña desde `SEED_SELLER_PASSWORD` (sin secretos en el repositorio; se documenta en `apps/backend/.env.example`).
- [PENDIENTE — fuera de esta spec] La constitución §1 sigue nombrando Hono (pendiente heredado de 005).
