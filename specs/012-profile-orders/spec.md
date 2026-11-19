# Spec 012 — Mis pedidos (sección en el perfil y creación al pagar)

## Contexto y objetivo
Hoy el flujo de compra (`specs/011-payment-form`) es un mock: al pulsar "Pagar" con el formulario válido, el carrito se vacía y se muestra la pantalla de éxito, **sin ninguna persistencia** — no existe modelo `Order`, ni API de pedidos, ni historial de compras. Los pedidos son, para el usuario, invisibles una vez completada la compra.

Esta spec agrega los **pedidos reales del comprador**: al confirmar el pago en `#/pago` se crea un pedido persistido en MongoDB (con folio correlativo legible, snapshot de los ítems al momento de la compra, total en CLP y estado `completado`), y el perfil (`#/perfil`) gana una sección **"Mis pedidos"** que lista esos pedidos, del más reciente al más antiguo, sin vista de detalle dedicada (el detalle vendrá después).

Es importante declarar qué reemplaza esta spec:

- **Modifica parcialmente 011 (RF-7, RF-8, RNF-2 y su "Fuera de alcance")**: el pago sigue siendo sin cobro ni pasarela, pero **ya no es 100 % sin red** — requiere una llamada al backend para registrar el pedido. Si no se puede crear el pedido, el pago no se completa.
- No modifica la autenticación ni el flujo de sesión existentes (005–007); el pedido se asocia a la sesión activa.
- `specs/011-payment-form/spec.md` y `specs/004-shopping-cart/spec.md` **no se editan en este paso**; sus actualizaciones documentales se harán al implementar (misma convención que 011 respecto de 004).

Lo que NO incluye aún: pasarela de pago real, cobros, devolución/cancelación/edición de pedidos, despacho, impuestos, boleta ni factura.

## Usuarios
- **Comprador autenticado**: persona con sesión iniciada que quiere ver qué ha comprado y cuándo, con folio y total, desde su perfil.
- **Comprador anónimo**: no puede crear ni ver pedidos; al intentar pagar es enviado a iniciar sesión y vuelve a `#/pago` (comportamiento de 011 RF-2, sin cambios).
- **Desarrollador/es**: (implícito) quien implementa la funcionalidad; requiere criterios verificables, separación lógica/UI y tests.

## Historias de usuario
- Como comprador, quiero que al pulsar "Pagar" quede registrado un pedido con mi compra, para tener constancia de lo que compré y su total.
- Como comprador, quiero ver en mi perfil la sección "Mis pedidos" con mis compras, folio, fecha, estado, ítems y total, para revisar mi historial de compras.
- Como comprador, quiero que el pedido conserve los productos y precios que pagué, aunque el producto cambie o se elimine después.
- Como comprador, quiero un mensaje claro si no se puede registrar mi pedido al pagar, para poder reintentarlo sin perder mi carrito.

## Requisitos funcionales

**RF-1 — Sección "Mis pedidos" en `#/perfil`.**
Mientras el usuario visualice `#/perfil` con sesión autenticada, el sistema deberá mostrar una sección "Mis pedidos" con los pedidos del usuario, del más reciente al más antiguo.
Criterios de aceptación:
- Cuando el usuario autenticado cargue `#/perfil`, deberá mostrarse una sección con encabezado "Mis pedidos", ubicada después de "Mi carrito" ([ASUMIDO]) y antes de "Favoritos", con referencia accesible propia (`aria-labelledby`).
- Cuando la sesión no esté autenticada, `#/perfil` sigue siendo una ruta protegida: no se renderiza ni la sección ni ningún dato de pedidos.
- Cuando los pedidos estén cargando, deberá mostrarse un indicador o texto de carga (p. ej. "Cargando tus pedidos…") dentro de la sección.
- Cuando la carga de pedidos falle, deberá mostrarse un mensaje de error anunciable (`role="alert"`) y una acción "Reintentar" que vuelva a solicitarlos.
- Cuando el usuario no tenga pedidos, deberá mostrarse un estado vacío (p. ej. "Aún no tienes pedidos.") con un botón "Explorar catálogo" hacia `#/catalogo`.
- Cuando se listan más de 5 pedidos, deberán mostrarse los 5 más recientes con un control "Ver más" que revela 5 adicionales por activación ([ASUMIDO], consistente con "Ver más" del historial).

**RF-2 — Creación del pedido al confirmar el pago en `#/pago`.**
Cuando el formulario de pago sea válido y el usuario active "Pagar", el sistema deberá crear un pedido en el backend antes de vaciar el carrito o mostrar el éxito.
Criterios de aceptación:
- Cuando el usuario active "Pagar" con el formulario válido, el sistema deberá hacer una petición a `POST /api/orders` con los ítems del carrito (identificador de producto y cantidad por línea); no deberá enviarse ningún dato de tarjeta ni de CVC (respeta 011 RF-9).
- Cuando "Pagar" se active, el botón deberá deshabilitarse y marcarse `aria-busy="true"` hasta que la respuesta se reciba, de modo que una doble activación no genere dos pedidos.
- Cuando el servidor responda éxito, el pedido deberá quedar asociado al usuario de la sesión (nunca a un usuario indicado por el cliente).
- Cuando el pedido se cree con éxito, el carrito deberá vaciarse por completo (mismo efecto que "Vaciar carrito"), los datos del formulario de tarjeta deberán descartarse y deberá mostrarse la pantalla de éxito (RF-7).
- Cuando `POST /api/orders` falle (error de red, 4xx o 5xx), deberá aplicarse RF-6 (pago bloqueado).

**RF-3 — Snapshot de ítems calculado en el servidor.**
Cuando se cree un pedido, el servidor deberá construir las líneas del pedido a partir de los datos vigentes de los productos en la base de datos, no de los precios enviados por el cliente.
Criterios de aceptación:
- Cuando se reciba `POST /api/orders`, el servidor deberá validar el cuerpo con Zod compartido (`@tiendadcc/utils`): `items` con al menos 1 línea, cada una con `productId` válido y `quantity` entero entre 1 y 999.
- Cuando se reciba la petición, el servidor deberá resolver cada `productId` contra la colección de productos y persistir por cada línea: `productId`, nombre, imagen, precio unitario, cantidad y subtotal (precio × cantidad) tomando el precio **actual** del producto.
- Cuando se reciba la petición, el total del pedido deberá ser la suma de los subtotales calculados en el servidor, en pesos chilenos como entero.
- Cuando algún `productId` no exista, el servidor deberá responder `400` con un mensaje en español (p. ej. "Uno de los productos de tu carrito ya no está disponible.") y no deberá crearse ningún pedido ni vaciarse el carrito.
- Cuando el pedido se cree, deberá guardar `createdAt` y `updatedAt` automáticos (timestamps de Mongoose).
- Cuando el pedido esté creado, su contenido (nombre, precio, imagen, subtotal por línea, total) no deberá cambiar aunque el producto se edite o elimine después; el pedido conserva el snapshot del momento de la compra.

**RF-4 — Folio correlativo legible y único.**
Cuando se cree un pedido, el servidor deberá asignarle un folio único, correlativo y legible.
Criterios de aceptación:
- Cuando se asigne el folio, deberá tener el formato `PED-<año>-<correlativo>`, con el correlativo relleno con ceros a la izquierda hasta al menos 4 dígitos (p. ej. `PED-2026-0007`) ([ASUMIDO] formato exacto).
- El folio deberá ser único en toda la colección, incluso bajo creación concurrente de pedidos (índice único; la secuencia se toma de forma atómica en el servidor).
- Cuando el cliente lea un pedido (listado o respuesta de creación), el folio deberá venir incluido y ser el mismo que ve el usuario.

**RF-5 — Estado `completado` único e inmutable.**
Mientras el pedido exista, su estado deberá ser `completado` y no podrá cambiar por acciones del usuario ni de la API en esta fase.
Criterios de aceptación:
- Cuando se cree el pedido (el pago mock siempre tiene éxito), el estado persistido deberá ser `completado`.
- Cuando se liste un pedido en el perfil, deberá mostrarse el estado "Completado".
- Cuando se consulte la API, no deberá existir endpoint para editar, cancelar ni eliminar un pedido (fuera de alcance de esta fase).
- Cuando el pedido se muestre en cualquier parte, no deberán mostrarse acciones de editar, cancelar ni eliminar.

**RF-6 — El fallo al crear el pedido bloquea el pago.**
Cuando `POST /api/orders` no se complete con éxito, el sistema deberá impedir que el pago se dé por realizado.
Criterios de aceptación:
- Cuando la creación falle, deberá mostrarse un mensaje de error anunciable (`role="alert"`, p. ej. "No pudimos registrar tu pedido. Inténtalo de nuevo.") dentro del formulario de pago.
- Cuando la creación falle, el carrito deberá conservar exactamente sus artículos y cantidades, los valores del formulario (correo, tarjeta, vencimiento, CVC, titular) deberán conservarse para permitir el reintento, y el botón "Pagar" deberá volver a habilitarse.
- Cuando la creación falle, no deberá mostrarse la pantalla de éxito ni vaciarse el carrito ni descartarse los datos del formulario.
- Cuando el usuario reintente "Pagar" tras un fallo, el flujo se ejecuta de nuevo desde la validación (una única creación por envío válido).

**RF-7 — Pantalla de éxito actualizada con el folio.**
Cuando el pedido se cree con éxito, el sistema deberá mostrar la pantalla de éxito de 011 (RF-8) enriquecida con el folio del pedido.
Criterios de aceptación:
- Cuando el pago se procese, deberá mostrarse "¡Compra realizada con éxito!" con el monto total pagado en formato chileno (comportamiento conservado de 011).
- Cuando el pago se procese, deberá mostrarse el folio del pedido creado (p. ej. "Tu pedido PED-2026-0007 quedó registrado.").
- Cuando el pago se procese, deberá mostrarse un enlace o botón "Ver mis pedidos" que navegue a `#/perfil`, además del botón "Volver a la tienda" hacia `/` ([ASUMIDO] la presencia del enlace).
- Cuando se muestre el éxito, no deberá mostrarse ningún dato de tarjeta (respeta 011 RF-9).
- La recarga de `#/pago` tras el éxito sigue redirigiendo a `#/catalogo` (comportamiento heredado de 011 RF-4/RF-8; el éxito vive solo en memoria).

**RF-8 — Listado de pedidos en el perfil (listado simple, sin detalle).**
Mientras el usuario autenticado visualice la sección "Mis pedidos", el sistema deberá listar sus pedidos como tarjetas, sin navegación a una vista de detalle en esta fase.
Criterios de aceptación:
- Cuando se liste un pedido, deberá mostrarse en su tarjeta: folio, fecha y hora de la compra en formato chileno (p. ej. `Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short' })`), estado "Completado", las líneas de ítems (miniatura si hay imagen, nombre, cantidad y subtotal por línea) y el total en formato chileno.
- Cuando se muestre una línea de ítem, deberá verse la cantidad multiplicada por el precio unitario y su subtotal (precio × cantidad), igual que en el resumen de pago.
- Cuando se muestre el total de un pedido, deberá ser el que persistió el servidor (RF-3), no un recálculo del cliente.
- Cuando se muestren los pedidos, deberán venir del servidor (`GET /api/orders`), ordenados del más reciente al más antiguo.
- Cuando se renderice el listado, no deberán mostrarse controles de editar, cancelar, eliminar ni "repetir pedido".
- Cuando se listan pedidos, cada tarjeta deberá ser legible desde 360 px de ancho, sin desplazamiento horizontal (una columna).

**RF-9 — API de pedidos autenticada y acotada al dueño.**
Mientras exista la API de pedidos, deberá exigir autenticación y devolver a cada usuario únicamente sus propios pedidos.
Criterios de aceptación:
- Cuando se llame a `POST /api/orders` sin sesión, el servidor deberá responder `401` y no crear nada.
- Cuando se llame a `GET /api/orders` sin sesión, el servidor deberá responder `401`.
- Cuando se llame a `GET /api/orders` con sesión, la respuesta deberá incluir únicamente los pedidos del usuario autenticado, con folio, estado, líneas con snapshot, total y fechas; ningún pedido de otra cuenta deberá ser accesible.
- Cuando `GET /api/orders` responda, el contrato público deberá estar validado con esquemas Zod compartidos en `@tiendadcc/utils` y revalidado en el servidor.
- Cuando la base de datos no responda, ambos endpoints deberán responder `503` con mensaje en español, y el perfil deberá mostrar el estado de error con "Reintentar" (RF-1).

**RF-10 — Ningún dato de pago toca el pedido ni la red.**
Mientras se cree o consulte un pedido, los datos de tarjeta jamás deberán formar parte de `/api/orders` ni persistirse.
Criterios de aceptación:
- Cuando se envíe `POST /api/orders`, el cuerpo deberá contener únicamente `items` (`productId`, `quantity`); ni número de tarjeta, ni CVC, ni vencimiento, ni titular deberán viajar al backend.
- Cuando se persista el pedido, el documento en MongoDB no deberá contener ningún dato de tarjeta.
- Cuando se muestre el pedido (éxito o perfil), no deberá mostrarse ningún dato de tarjeta.

## Requisitos no funcionales
- **RNF-1 Idioma.** Todo texto orientado al usuario final en español (constitución §6). Identificadores, tipos y funciones en inglés.
- **RNF-2 Stack sin dependencias nuevas.** El pedido usa el stack existente (constitución §1): modelo Mongoose (`Order`), rutas y middleware Express con `requireAuth`, validación Zod compartida en `utils/`, React 19 + Tailwind v4 en el front. No se instala ninguna librería nueva, ni de numeración de folios ni de fechas.
- **RNF-3 Esta spec reemplaza parcialmente 011.** Se conserva de 011: protección de `#/pago`, formulario y validación Zod básica sin Luhn, no persistir tarjetas (RF-9 de 011), éxito en la misma ruta. Se reemplaza: "sin red" (RNF-2/RF-7 de 011) — el pago ahora exige `POST /api/orders` y falla cerrado si no se puede registrar el pedido —; y la pantalla de éxito incorpora el folio (011 RF-8). La persistencia de pedidos deja de estar fuera de alcance. `011/spec.md` se actualiza al implementar, no en este paso.
- **RNF-4 Separación lógica/UI.** La llamada a la API vive en un módulo de lógica (p. ej. `logic/orderApi.ts`) desacoplado de los componentes; los componentes solo presentación y estado de UI (constitución §3). La validación de entrada del endpoint vive en Zod compartido.
- **RNF-5 Integridad del folio bajo concurrencia.** El folio no puede duplicarse ni saltar por condiciones de carrera; se garantiza con secuencia atómica y/o índice único (estrategia concreta: `plan.md`).
- **RNF-6 Accesibilidad.** La sección "Mis pedidos" deberá ser operable por teclado, con encabezado asociado (`aria-labelledby`), foco visible con el token `ring` y errores anunciables (`role="alert"`); los estados vacío/carga/error no deberán depender solo del color.
- **RNF-7 Responsividad.** Una columna desde 360 px hasta escritorio; ancho máximo de lectura en escritorio; sin desplazamiento horizontal en 360 px.
- **RNF-8 Tests.** Toda la lógica nueva debe tener tests (constitución §4): esquemas Zod del pedido en `utils`, servicio y rutas con `mongodb-memory-server` (patrón existente), módulo de API del frontend con `fetch` simulado, y helpers puros (formato de fecha/total si se extraen). Cobertura de creación con producto inexistente (400), 401 sin sesión y aislamiento entre usuarios.
- **RNF-9 Precio y total en servidor.** El cliente nunca envía precios ni totales; el servidor es la única fuente del snapshot y del total (evita manipulación desde el navegador).

## Casos límite
- Carrito vacío al entrar a `#/pago` (o recarga): redirección a `#/catalogo`, sin creación de pedido (cubierto por 011 RF-4, sin cambios).
- Producto del carrito eliminado entre el armado del carrito y "Pagar": `400`, pago bloqueado, carrito intacto y mensaje para revisar el carrito (cubierto por RF-3, RF-6).
- Doble clic o doble envío de "Pagar": el botón queda deshabilitado con `aria-busy` mientras se crea el pedido; tras el éxito el formulario ya no existe (cubierto por RF-2).
- Dos pestañas pagan a la vez con la misma cuenta: cada pago válido crea su propio pedido, con folios distintos (cubierto por RF-4, RF-5).
- Pérdida de red o 5xx al pulsar "Pagar": mensaje de error, carrito y formulario intactos, reintento posible (cubierto por RF-6).
- Backend caído al cargar el perfil: la sección muestra el error con "Reintentar"; el resto del perfil carga normalmente (cubierto por RF-1, RF-9).
- Producto editado o eliminado después de la compra: el pedido conserva el snapshot; nunca se rompe ni desaparece (cubierto por RF-3).
- Usuario nuevo sin compras: estado vacío con "Explorar catálogo" (cubierto por RF-1).
- Cambio de cuenta en el mismo navegador: `GET /api/orders` devuelve solo los pedidos de la sesión vigente; los de la cuenta anterior no se muestran (cubierto por RF-9).
- Folio correlativo en cambio de año (`PED-2026-…` → `PED-2027-…`): el correlativo es global y continuo; el año solo antecede el número ([ASUMIDO], cubierto por RF-4).

## Fuera de alcance
- Pasarela de pago real, cobros bancarios o integración Transbank/Webpay/Stripe; el pago sigue siendo un mock de validación básica.
- Edición, cancelación, devolución o eliminación de pedidos; cualquier estado distinto de `completado`.
- Vista de detalle dedicada del pedido (`#/mis-pedidos/:id` o similar); en esta fase el listado simple muestra la información completa inline.
- Dirección de envío, despacho, cupones, stock, impuestos, boleta y facturación.
- Persistencia de tarjetas, "pagar con tarjeta" guardada y folio de boleta.
- Cambios a las specs 004, 006, 009 y 011 en este paso (sus actualizaciones documentales se harán al implementar, con `plan.md`).
- Despliegue y producción.

## Criterios de finalización
1. Al pulsar "Pagar" con el formulario válido, se crea el pedido con `POST /api/orders` antes de vaciar el carrito; el botón se deshabilita con `aria-busy` durante la creación (RF-2).
2. El pedido persiste en MongoDB con: folio correlativo único (`PED-<año>-<correlativo>`), snapshot de líneas (productId, nombre, imagen, precio unitario, cantidad, subtotal), total calculado en el servidor, estado `completado`, timestamps y relación al usuario (RF-3, RF-4, RF-5).
3. `POST /api/orders` sin sesión responde `401`; con líneas inválidas o producto inexistente responde `400` y no persiste nada (RF-3, RF-9).
4. Si la creación falla, el pago queda bloqueado: error anunciable, carrito y valores del formulario intactos, sin éxito ni vaciado (RF-6).
5. `#/perfil` muestra la sección "Mis pedidos" (tras "Mi carrito"), con carga, error + "Reintentar", estado vacío y listado simple de tarjetas con folio, fecha/hora en formato chileno, estado, líneas con subtotal y total; sin acciones de edición (RF-1, RF-8).
6. El listado muestra los 5 más recientes con "Ver más" (+5 por activación) (RF-1).
7. `GET /api/orders` exige sesión (`401` sin ella) y devuelve solo los pedidos del usuario, del más reciente al más antiguo; la respuesta usa esquemas Zod compartidos (RF-9).
8. La pantalla de éxito muestra "¡Compra realizada con éxito!", el monto pagado, el folio del pedido y enlaces a "Ver mis pedidos" (`#/perfil`) y "Volver a la tienda" (`/`) (RF-7).
9. Ningún dato de tarjeta viaja en `POST /api/orders`, se persiste o se muestra; el pedido no contiene datos de pago (RF-10).
10. La sección y la pantalla de éxito son operables por teclado, con encabezado accesible, foco visible y errores anunciables; el layout es una columna sin scroll horizontal desde 360 px (RNF-6, RNF-7).
11. La lógica nueva tiene tests Vitest (utils, servicio y rutas con `mongodb-memory-server`, API del frontend con `fetch` simulado) y se respeta la separación lógica/UI (RNF-4, RNF-8).
12. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Persistencia: pedido real en MongoDB (modelo `Order`), creado en el momento del pago (`011` deja de ser 100 % sin red; la compra falla cerrado si no se puede registrar el pedido).
- [RESUELTO] Alcance en el perfil: listado simple, sin vista de detalle; las tarjetas muestran folio, fecha, estado, ítems y total inline.
- [RESUELTO] Contenido del pedido: fecha y hora, ítems con cantidades (snapshot), total en CLP, folio correlativo legible y estado.
- [RESUELTO] Snapshot: nombre, precio unitario, imagen y subtotal al momento de la compra; el cliente envía solo `productId` y `quantity`, el servidor calcula precios y total desde la base de datos.
- [RESUELTO] Fallo al crear: bloqueo del pago (error anunciable, carrito y formulario intactos, reintento posible), nunca éxito sin pedido.
- [RESUELTO] Estado: único e inmutable `completado`; sin cancelar/editar en esta fase.
- [ASUMIDO] Formato exacto del folio: `PED-<año>-<correlativo>` relleno a 4 dígitos; correlativo global y continuo entre años (el año solo antecede).
- [ASUMIDO] Ubicación de la sección: entre "Mi carrito" y "Favoritos" en `#/perfil`.
- [ASUMIDO] Paginación del listado: 5 pedidos visibles con "Ver más" (+5 por activación), patrón del historial.
- [ASUMIDO] La pantalla de éxito incorpora el folio y un enlace "Ver mis pedidos" → `#/perfil`; "Volver a la tienda" se conserva.
- [ASUMIDO] Cantidad por línea acotada a 1–999 en la validación Zod compartida.
- [PENDIENTE — hablarlo con el equipo] Al implementar: actualizar `specs/004-shopping-cart`, `specs/006-user-profile` (nueva sección) y `specs/011-payment-form` (RF-7/RF-8/RNF-2, "Fuera de alcance" y criterios de finalización) para que reflejen esta spec, como hizo 011 con 004.
