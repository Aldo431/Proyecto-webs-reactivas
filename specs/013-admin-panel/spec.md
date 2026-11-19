# Spec 013 — Panel de administración (contenido)

## Contexto y objetivo
La spec 012 dejó el rol `admin`, el middleware `requireAdmin`, el enrutador `/api/admin` y el armazón del panel en `#/admin` (barra lateral y cuatro secciones que solo muestran título y descripción).

Esta spec **llena las cuatro secciones** siguiendo los mockups ("TiendaDCC · Mockups dashboard administrador"):
- **Resumen**: indicadores, productos por categoría, actividad reciente, últimas publicaciones y reseñas con calificación baja.
- **Productos**: todos los productos de cualquier vendedor; marcar o quitar destacados y eliminar.
- **Usuarios**: cuentas registradas; dar o quitar el rol de administrador.
- **Reseñas**: moderación con filtro por calificación; eliminar.

Además corrige un vacío de la spec 008: al borrar un producto, sus reseñas quedaban en la base.

Lo que NO incluye: ventas, ingresos u órdenes (el pago de 011 es simulado y no guarda compras), eliminar o suspender cuentas, editar el contenido de productos o reseñas ajenos, ni contadores en la barra lateral.

## Usuarios
- **Administrador** (rol `admin`, spec 012): único usuario de esta spec.
- **Usuario registrado / visitante**: no accede; la API responde 401/403 (012 RF-4) y el frontend redirige (012 RF-6).

## Historias de usuario
- Como administrador, quiero ver de un vistazo cuántos usuarios, productos y reseñas hay, y qué pasó últimamente, para saber el estado de la tienda.
- Como administrador, quiero elegir qué productos aparecen como destacados en el inicio.
- Como administrador, quiero retirar una publicación inapropiada aunque no sea mía.
- Como administrador, quiero dar el rol de administrador a otro integrante, o quitárselo.
- Como administrador, quiero encontrar y eliminar reseñas ofensivas o falsas.

## Convenciones de esta spec
- Todas las rutas nuevas van bajo `/api/admin` y heredan `requireAuth` + `requireAdmin` (401 → 403). Después: 404 → 400, igual que en 008.
- Un id que no sea 24 hexadecimales, o que no exista, da **404**.
- Las listas paginadas usan `pagina` (desde 1) y responden `{ items, total, pagina, porPagina, totalPaginas }` con `porPagina = 20` (`ADMIN_PAGE_SIZE`). Una página mayor que la última se ajusta a la última; sin resultados, `pagina = 1` y `totalPaginas = 0` (mismo criterio que 009).
- Parámetros de consulta inválidos dan **400** con mensaje en español.
- Fechas en ISO 8601 en la API; en la interfaz, `Intl` con `es-CL`.
- Los mensajes de éxito usan `role="status"` (como 008).

## Requisitos funcionales

### Backend

**RF-1 — Datos del Resumen: `GET /api/admin/overview`.**
Deberá responder en una sola llamada:
```json
{
  "users":    { "total": 27, "newLast7Days": 5, "admins": 2 },
  "products": { "total": 12, "featured": 3,
                "byCategory": [ { "category": "Poleras", "count": 4 }, … ] },
  "reviews":  { "total": 18, "newLast7Days": 4, "averageRating": 4.2, "lowLast7Days": 2 },
  "activity":       [ … ],
  "latestProducts": [ … ],
  "lowReviews":     [ … ]
}
```
Criterios de aceptación:
- `byCategory` trae las cuatro categorías de `PRODUCT_CATEGORIES`, en ese orden, incluidas las que tienen 0.
- `averageRating` es el promedio de todas las reseñas redondeado a 1 decimal, o `null` si no hay reseñas.
- "Últimos 7 días" se cuenta desde el momento de la solicitud (`createdAt >= ahora − 7 días`).
- `lowLast7Days` cuenta reseñas de 1 o 2 estrellas creadas en los últimos 7 días.
- `activity` trae hasta 8 eventos ordenados del más reciente al más antiguo, mezclando tres tipos:
  - `{ "type": "user_registered", "at", "user": { "username" } }`
  - `{ "type": "product_published", "at", "user": { "username" }, "product": { "id", "name" } }`
  - `{ "type": "review_created", "at", "user": { "username" }, "product": { "id", "name" }, "rating" }`
- `latestProducts` trae los 4 productos más recientes con el formato público de producto (008).
- `lowReviews` trae hasta 3 reseñas de 1 o 2 estrellas de los últimos 7 días, más recientes primero, con el formato de RF-8.
- Sin datos (base vacía) responde 200 con ceros, listas vacías y `averageRating: null`.

**RF-2 — Listado de productos: `GET /api/admin/products`.**
Parámetros opcionales: `q` (nombre del producto o `username` del vendedor, sin distinguir mayúsculas ni tildes, máx. 100 caracteres), `categoria` (una de `PRODUCT_CATEGORIES`), `destacados` (`"true"` para solo destacados), `pagina`.
Criterios de aceptación:
- Ordena del más reciente al más antiguo.
- Cada ítem es el producto público de 008 más `reviewCount` (entero) y `averageRating` (1 decimal o `null`).
- Los listados no leen el base64 de las imágenes (misma proyección que 008).

**RF-3 — Destacar: `PATCH /api/admin/products/:id/featured`.**
Cuerpo `{ "featured": boolean }`.
Criterios de aceptación:
- Responde 200 con el producto actualizado en el formato de RF-2.
- Un cuerpo sin `featured` booleano da 400 "Indica si el producto es destacado.".
- Cambiar `featured` actualiza `updatedAt`; el `?v=` de la URL de la imagen cambia y la imagen sigue cargando (comportamiento normal de 008).
- El cambio se ve en el inicio (`GET /api/products?featured=true`) en la siguiente carga.

**RF-4 — Eliminar cualquier producto: `DELETE /api/admin/products/:id`.**
Criterios de aceptación:
- Responde 204 aunque el producto sea de otro usuario.
- Quita el id de favoritos, historial y carrito de todas las cuentas (igual que 008 RF-11).
- Borra todas las reseñas del producto (RF-5).

**RF-5 — Al borrar un producto se borran sus reseñas (corrige 008).**
Criterios de aceptación:
- Cuando el dueño borre su producto (`DELETE /api/products/:id`) o un administrador lo borre (RF-4), todas las reseñas con ese `product` deberán eliminarse.
- Ambos caminos usan la misma función de servicio, para no duplicar la limpieza.

**RF-6 — Listado de usuarios: `GET /api/admin/users`.**
Parámetros opcionales: `q` (nombre a mostrar, `username` o correo; sin distinguir mayúsculas ni tildes), `rol` (`"admin"` o `"user"`), `pagina`.
Criterios de aceptación:
- Ordena del registro más reciente al más antiguo.
- Cada ítem: `{ id, username, displayName, email, role, emailVerified, productCount, reviewCount, createdAt }`.
- Nunca incluye `passwordHash`, `resetToken`, `sessionVersion`, favoritos, historial ni carrito.
- Cuentas legadas sin `role` se informan como `"user"` y el filtro `rol=user` las incluye.

**RF-7 — Cambiar rol: `PATCH /api/admin/users/:id/role`.**
Cuerpo `{ "role": "admin" | "user" }`.
Criterios de aceptación:
- Responde 200 con el usuario en el formato de RF-6.
- Si `:id` es el propio administrador, responde **403** "No puedes cambiar tu propio rol." (así siempre queda al menos un administrador).
- Un rol inválido da 400 "Rol inválido.".
- Asignar el rol que ya tiene responde 200 sin error.
- El cambio aplica en la siguiente solicitud del afectado (012 RF-3).

**RF-8 — Listado de reseñas: `GET /api/admin/reviews`.**
Parámetros opcionales: `calificacion` (`"bajas"` = 1–2, `"altas"` = 4–5; sin parámetro = todas), `orden` (`"recientes"` por defecto, o `"menor"` = calificación ascendente y luego más recientes), `pagina`.
Criterios de aceptación:
- Cada ítem es la reseña pública de 010 más `product: { id, name }`.
- Reseñas cuyo producto ya no existe no se listan.

**RF-9 — Eliminar cualquier reseña: `DELETE /api/admin/reviews/:id`.**
Criterios de aceptación:
- Responde 204 aunque la reseña sea de otro usuario.
- El promedio público del producto (`GET /api/products/:id/reviews`) se recalcula solo, porque se calcula al leer.

### Frontend

**RF-10 — Sección Resumen (`#/admin`).**
Criterios de aceptación:
- Conserva el guiño `$ sudo tiendadcc --resumen`, el título y la descripción (012).
- Cuatro indicadores en tarjetas: "Usuarios registrados" (`total`, nota "+N esta semana"), "Productos publicados" (`total`, nota "N destacados"), "Reseñas" (`total`, nota "+N esta semana"), "Calificación promedio" (`averageRating` con coma decimal, nota "de 5 estrellas"; sin reseñas muestra "—" y "sin reseñas aún"). Las notas "+N" se muestran en verde (`terminal-success`) solo si N > 0.
- "Productos por categoría": barras horizontales proporcionales al máximo, con el número a la derecha; el gráfico completo tiene `role="img"` y un `aria-label` con todos los valores.
- "Actividad reciente": lista de eventos con `@usuario` en `font-mono`, texto según el tipo ("creó su cuenta", "publicó «Nombre»", "dejó una reseña de N estrellas en «Nombre»") y tiempo relativo ("hace 2 h", con `Intl.RelativeTimeFormat("es")`).
- "Últimas publicaciones": tabla con miniatura, nombre, categoría, `@vendedor`, precio CLP y fecha; enlace "Ver todas →" a `#/admin/productos`.
- "Reseñas por revisar": hasta 3 tarjetas con producto, calificación, comentario, autor y tiempo relativo; enlace "Ir a moderación →" a `#/admin/resenas`. Sin reseñas bajas muestra "No hay reseñas con calificación baja esta semana.".
- Botón "Actualizar" que vuelve a pedir los datos.
- Estados: mientras carga, un texto "Cargando resumen…" con `aria-busy`; si falla, el mensaje de error y un botón "Reintentar".

**RF-11 — Sección Productos (`#/admin/productos`).**
Criterios de aceptación:
- Controles: búsqueda (con `label` "Buscar", placeholder "Nombre o vendedor"), selector "Categoría" (Todas + las cuatro) y un grupo de dos botones "Todos" / "Destacados" con `aria-pressed`. Cambiar un filtro vuelve a la página 1.
- Los filtros viven en la URL (`?q=…&categoria=…&destacados=true&pagina=2`), para que recargar conserve la vista.
- Tabla (dentro de un contenedor con `overflow-x-auto`) con columnas: Producto (miniatura + nombre + categoría), Vendedor, Precio, Reseñas (★ promedio y cantidad, o "—"), Publicado, Destacado, Acciones.
- "Destacado" es un `<button role="switch" aria-checked>` con `aria-label="Destacar «Nombre»"`. Al cambiarlo se llama a RF-3; mientras responde queda deshabilitado; al terminar muestra "«Nombre» ahora aparece en Destacados del inicio." o "«Nombre» ya no está destacado."; si falla, vuelve a su estado anterior y muestra el error.
- Acciones: "Ver" (enlace a `#/producto/:id`, ícono con `aria-label`) y "Eliminar" con `ConfirmDeleteDialog`, cuyo texto dice que la publicación es de `@vendedor` y que se quitará del catálogo, de favoritos, historiales y carritos, y que también se borrarán sus reseñas. Al confirmar: llama a RF-4, quita la fila y muestra "Publicación eliminada.".
- Pie: "Mostrando X–Y de Z" y paginación Anterior/Siguiente (reutiliza `CatalogPagination` si encaja).
- Vacío: "No hay productos que coincidan con los filtros.".

**RF-12 — Sección Usuarios (`#/admin/usuarios`).**
Criterios de aceptación:
- Controles: búsqueda ("Nombre, usuario o correo") y selector "Rol" (Todos, Administradores, Usuarios), sincronizados con la URL.
- Tabla con: Usuario (inicial en círculo, nombre a mostrar, `@username`; "(tú)" en la propia cuenta), Correo, Rol (insignia ámbar "Administrador" o insignia neutra "Usuario"), Publicaciones, Reseñas, Registro, Acción.
- Acción: "Hacer administrador" o "Quitar administrador", con un `AlertDialog` de confirmación:
  - dar: "¿Hacer administrador a @usuario?" / "Podrá destacar y eliminar cualquier producto, moderar reseñas y cambiar el rol de otros usuarios.";
  - quitar: "¿Quitar el rol de administrador a @usuario?" / "Volverá a ser un usuario normal y dejará de ver este panel.".
- En la propia fila no hay botón; en su lugar el texto "Tu cuenta".
- Al confirmar: llama a RF-7, actualiza la fila y muestra "@usuario ahora es administrador." o "@usuario ahora es usuario.".

**RF-13 — Sección Reseñas (`#/admin/resenas`).**
Criterios de aceptación:
- Controles: grupo "Todas" / "1–2 estrellas" / "4–5 estrellas" (`aria-pressed`) y selector "Ordenar" (Más recientes, Menor calificación), sincronizados con la URL.
- Cada reseña en una tarjeta: miniatura y nombre del producto (enlace a `#/producto/:id`), estrellas con `role="img"` y `aria-label="N de 5 estrellas"`, insignia "baja" si es de 1–2, comentario, `@autor` y fecha. Las de 1–2 estrellas tienen borde ámbar.
- "Eliminar" con `ConfirmDeleteDialog` ("Eliminar reseña" / "Se borrará la reseña de @autor sobre «Producto». No se puede deshacer."). Al confirmar: RF-9, quita la tarjeta y muestra "Reseña eliminada.".
- Paginación como en Productos. Vacío: "No hay reseñas con este filtro.".

**RF-14 — Volver a cargar tras una acción.**
Criterios de aceptación:
- Después de eliminar o cambiar algo, si la página actual queda vacía y no es la primera, se carga la página anterior.
- Al volver a `#/admin` desde otra sección, el Resumen se pide de nuevo (no se guarda en caché entre visitas).

## Requisitos no funcionales
- **RNF-1 Idioma.** Textos en español; identificadores en inglés (§6).
- **RNF-2 Sin dependencias nuevas** (§1). El switch se hace con `<button role="switch">` y los diálogos con el `alert-dialog` ya instalado.
- **RNF-3 Lógica separada** (§3). Llamadas a la API, parsing de respuestas, lectura y escritura de filtros en la URL y formateo (tiempo relativo, promedio, texto de actividad) viven en `src/logic/` con tests; los componentes solo presentan.
- **RNF-4 Validación con Zod** (AGENTS.md). Consultas y cuerpos en el backend, y respuestas en el frontend, se validan con esquemas de `@tiendadcc/utils`.
- **RNF-5 Sistema de diseño** (spec 00). Tokens de `styles.css`, `font-mono` para títulos, cifras, precios y `@usuario`; un solo guiño de terminal (el del Resumen).
- **RNF-6 Responsivo.** Desde 360 px sin desplazamiento horizontal de la página; las tablas se desplazan dentro de su contenedor.
- **RNF-7 Accesibilidad.** Controles reales (`button`, `a`, `input` + `label`), `aria-label` en botones de solo ícono, foco visible, contraste de texto ≥ 4,5:1.
- **RNF-8 Rendimiento.** Ningún listado lee el base64 de imágenes; los conteos por producto y por usuario se hacen con agregaciones, no con una consulta por fila.

## Casos límite
- **Dos administradores editando a la vez:** gana el último; la interfaz muestra el estado que devolvió la API.
- **Producto borrado mientras otra pestaña lo ve:** destacar o borrar responde 404; la interfaz muestra "Producto no encontrado." y recarga la página.
- **Cuenta degradada con el panel abierto:** la siguiente llamada recibe 403; la interfaz muestra el mensaje y un enlace "Volver a la tienda".
- **Producto sin vendedor (cuenta inexistente):** se omite del listado, igual que en 008.
- **Reseña de producto borrado antes de RF-5 (huérfana):** no se lista ni se cuenta en el Resumen.

## Fuera de alcance
- Ventas, ingresos y órdenes.
- Eliminar, suspender o verificar cuentas.
- Editar productos o reseñas de otros (solo destacar y eliminar).
- Contadores en la barra lateral del panel.
- Exportar datos.

## Criterios de finalización
- RF-1 a RF-14 cumplidos, con tests de backend (supertest + mongodb-memory-server) para cada ruta y de frontend para la lógica.
- Prueba manual: con datos del seed más al menos dos cuentas, dos productos publicados por usuarios y reseñas de 1 y 5 estrellas, cada sección se ve como en los mockups y todas sus acciones funcionan.
- `npm run check` en verde.
