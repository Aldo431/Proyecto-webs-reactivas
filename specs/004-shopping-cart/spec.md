# Spec 004 — Carrito de compras (Panel lateral)

## Contexto y objetivo
Actualmente la tienda permite explorar productos en el inicio y en el catálogo (`specs/003-products-catalog`), así como ver el detalle individual (`specs/002-product-detail`). En el encabezado (`Header`), el acceso al carrito existe solo como marcador inactivo (`ComingSoonItem` con etiqueta "Carrito" en `apps/frontend/client/src/components/Header.tsx`). El catálogo (`apps/frontend/client/src/data/products.json`) no tiene campo de precio y el esquema Zod (`productParse.ts`) no lo valida. La tarjeta (`ProductCard.tsx`) es un `Link` completo al detalle.

Esta spec define un **carrito solo frontend en panel lateral (drawer)**: agregar desde detalle y desde tarjetas (catálogo e inicio), modificar cantidades, eliminar, vaciar, ver subtotales y total en pesos chilenos, y persistir en `localStorage` con clave `cart`. Incluye botón mock `Finalizar compra` que solo cierra el panel. No hay backend, pagos ni stock dinámico. Para montos se sanciona `price` en `products.json` y en Zod.

Lo que NO incluye aún: pasarela de pago, stock validado, auth/sync en nube, cupones/despacho/impuestos, página `/carrito` dedicada, sync entre pestañas, selector de cantidad ni tope por producto.

## Usuarios
- **Comprador / Estudiante**: persona que navega la tienda y acumula productos sin perder su contexto de navegación.
- **Desarrollador /s**: (implícito) quien implementa la funcionalidad; requiere criterios verificables, separación lógica/UI y tests.

## Historias de usuario
- Como comprador, quiero ver un botón del carrito en el encabezado con la cantidad total, para tener visibilidad permanente de mi compra.
- Como comprador, quiero pulsar "Agregar al carrito" en el detalle, para sumar ese producto a mi selección.
- Como comprador, quiero agregar rápido con "Agregar" desde las tarjetas del catálogo e inicio, para no entrar al detalle cada vez.
- Como comprador, quiero que al agregar se abra un panel lateral sin abandonar mi página, para confirmar sin perder contexto.
- Como comprador, quiero aumentar, disminuir, eliminar o vaciar productos en el panel, para ajustar mi pedido.
- Como comprador, quiero ver subtotal por producto y total en pesos chilenos, para saber cuánto gastaría.
- Como comprador, quiero que el carrito se conserve al recargar, para no perder mi selección.
- Como comprador, quiero un botón "Finalizar compra" que cierre el panel por ahora, para dejar el checkout real a futuro.

## Requisitos funcionales

**RF-1 — Acceso al carrito en el encabezado.**
Cuando el usuario visualice el encabezado en cualquier vista, el sistema deberá mostrar un botón de carrito interactivo que reemplace el marcador "Próximamente", con la suma total de unidades.
Criterios de aceptación:
- Cuando el carrito tenga 0 unidades, el botón deberá mostrar el icono `ShoppingCart` y la etiqueta "Carrito" sin badge numérico.
- Cuando el carrito tenga entre 1 y 99 unidades, el botón deberá mostrar un badge numérico con la suma total de unidades.
- Cuando el carrito supere 99 unidades, el badge deberá mostrar "99+".
- Cuando el usuario active el botón con clic o teclado (Enter o Espacio), el sistema deberá abrir el panel lateral sin modificar la URL ni recargar.
- Cuando el panel esté abierto, el botón deberá indicar `aria-expanded="true"`; cuando esté cerrado, `aria-expanded="false"`.

**RF-2 — Panel lateral (Drawer) del carrito.**
Mientras el panel esté visible, el sistema deberá superponerse como diálogo lateral derecho sobre la vista actual, con backdrop y controles accesibles de cierre.
Criterios de aceptación:
- Cuando el panel se abra, deberá presentarse anclado a la derecha con el título "Tu Carrito".
- Cuando el panel esté abierto, el sistema deberá bloquear el desplazamiento del fondo (body scroll lock) y permitir scroll interno de la lista.
- Cuando el usuario active el botón de cerrar (visual "✕" con `aria-label="Cerrar carrito"`), haga clic en el backdrop o pulse `Escape`, el panel deberá cerrarse sin alterar el carrito.
- Cuando el panel se cierre, el sistema deberá restaurar el foco en el botón del encabezado que lo abrió.
- Cuando el usuario navegue (p. ej. active "Explorar catálogo"), el panel deberá cerrarse automáticamente.
- Cuando el panel se visualice en 360 px de ancho, deberá ocupar `calc(100vw - 32px)` sin desplazamiento horizontal; en escritorio deberá tener un ancho máximo de 420 px.

**RF-3 — Agregar producto desde detalle y tarjetas.**
Cuando el usuario esté en el detalle o en una tarjeta de catálogo/inicio, el sistema deberá ofrecer agregar con cantidad +1 y abrir el panel como confirmación.
Criterios de aceptación:
- Cuando el detalle muestre un producto existente, deberá mostrar el botón primario "Agregar al carrito".
- Cuando una tarjeta de catálogo o inicio se muestre, deberá mostrar un botón "Agregar" fuera del `Link` de la tarjeta, con `aria-label="Agregar <nombre> al carrito"`.
- Cuando el usuario active "Agregar al carrito" o "Agregar", deberá sumarse 1 unidad del producto correspondiente.
- Cuando el producto ya exista en el carrito, su cantidad deberá incrementarse en 1 sin crear fila duplicada y sin tope máximo.
- Cuando el producto se agregue exitosamente, el panel lateral deberá abrirse automáticamente.
- Cuando el usuario active "Agregar" en una tarjeta, no deberá navegarse al detalle.
- Cuando el detalle muestre "Producto no encontrado", no deberá mostrarse "Agregar al carrito".

**RF-4 — Modificación de cantidades y eliminación.**
Mientras el usuario visualice artículos en el panel, el sistema deberá permitir incrementar, decrementar o eliminar cada artículo.
Criterios de aceptación:
- Cuando el usuario active el control `+` de un artículo, su cantidad deberá incrementarse en 1.
- Cuando el usuario active el control `-` de un artículo con cantidad mayor a 1, su cantidad deberá disminuirse en 1.
- Cuando el usuario active el control `-` de un artículo con cantidad igual a 1, el artículo deberá removerse del carrito.
- Cuando el usuario active el botón eliminar (icono papelera con `aria-label="Eliminar <nombre> del carrito"`), el artículo deberá removerse inmediatamente.

**RF-5 — Cálculo y desglose de precios.**
Mientras haya artículos en el carrito, el sistema deberá calcular y mostrar precio unitario, subtotal por línea y total general en pesos chilenos.
Criterios de aceptación:
- Cuando un artículo se agregue o cambie su cantidad, su subtotal (`precio * cantidad`) deberá recalcularse y mostrarse de inmediato.
- Cuando cualquier artículo cambie o se elimine, el total general deberá actualizarse de inmediato.
- Cuando los precios se muestren, deberán usar formato chileno con `Intl.NumberFormat('es-CL')` (p. ej. `$6.000`, `$12.000`).
- Cuando se calculen totales, no deberán ocurrir errores de coma flotante (los precios son enteros) ni valores negativos.

**RF-6 — Estado vacío del carrito.**
Cuando el carrito no contenga artículos, el sistema deberá mostrar un estado vacío que guíe al usuario.
Criterios de aceptación:
- Cuando el carrito no tenga artículos, deberá mostrarse el mensaje "Tu carrito está vacío.".
- Cuando el carrito no tenga artículos, deberá mostrarse el botón "Explorar catálogo" que cierra el panel y navega a `#/catalogo`.
- Cuando el carrito no tenga artículos, no deberán mostrarse la sección de totales ni los botones "Vaciar carrito" y "Finalizar compra".

**RF-7 — Persistencia en almacenamiento local.**
Cuando ocurra cualquier cambio en el carrito, el sistema deberá persistirlo en `localStorage` con clave `cart`.
Criterios de aceptación:
- Cuando la aplicación inicie o recargue, el carrito deberá restaurarse desde `localStorage` clave `cart`.
- Cuando los datos leídos estén corruptos o no cumplan el esquema Zod, el sistema deberá descartarlos, iniciar con carrito vacío y no arrojar excepciones no controladas.
- Cuando un `productId` guardado ya no exista en `products.json`, ese ítem deberá descartarse al cargar.
- Cuando un producto guardado siga existiendo pero su `name`, `price` o `image` hayan cambiado en el catálogo, deberán actualizarse a los valores del catálogo manteniendo la `quantity` guardada.
- Cuando el usuario vacíe el carrito, `localStorage` deberá actualizarse en consecuencia.
- Cuando `localStorage` esté deshabilitado o exceda cuota, la aplicación no deberá crashear y deberá operar en memoria durante la sesión.
- Cuando el carrito cambie en una pestaña, no se exigirá sincronización con otras pestañas en esta fase.

**RF-8 — Modelo de datos con precio.**
El sistema deberá incorporar `price` entero positivo en pesos chilenos al modelo, validación y visualización.
Criterios de aceptación:
- Cuando los productos se lean desde `products.json`, cada producto deberá incluir `price` entero positivo según la tabla: Taza DCC 6000, Polera DCC 12000, Sticker DCC 1500.
- Cuando se validen productos con Zod, `price` deberá validarse como `z.number().int().positive()`; sin `price` o con negativos/decimales deberá rechazarse.
- Cuando se visualice el detalle, el precio formateado deberá mostrarse junto a descripción y categoría.
- Cuando se visualicen tarjetas de catálogo e inicio, cada tarjeta deberá mostrar el precio formateado.

**RF-9 — Vaciar y finalizar (mock).**
Mientras haya artículos en el carrito, el sistema deberá ofrecer vaciar todo y un cierre mock de compra sin procesar pago.
Criterios de aceptación:
- Cuando haya artículos, el pie del panel deberá mostrar los botones "Vaciar carrito" y "Finalizar compra".
- Cuando el usuario active "Vaciar carrito", todos los artículos deberán removerse de inmediato sin confirmación, persistirse el vacío y mostrarse el estado vacío (RF-6, RF-7).
- Cuando el usuario active "Finalizar compra", el panel deberá cerrarse sin modificar el carrito, sin llamadas de red y sin navegar.

## Requisitos no funcionales
- **RNF-1 Idioma.** Todo texto orientado al usuario final en español (constitución §6). Identificadores, tipos y funciones en inglés.
- **RNF-2 Sin backend ni red.** El carrito opera solo en cliente con React state y `localStorage`. Sin peticiones de red, APIs ni base de datos (constitución §1, §5).
- **RNF-3 Sistema de diseño "IDE institucional".** Respeta `specs/00-design-system/spec.md`: superficie `card`, bordes y backdrop semánticos, primitivas `Button` y `Badge` de `src/components/ui/`, texto en `font-sans`, precios y badge en `font-mono`, tema oscuro único sin selector.
- **RNF-4 Accesibilidad.** El panel es `role="dialog"` con `aria-modal="true"` y `aria-labelledby` al título. Foco atrapado dentro mientras está abierto y retorno al activador al cerrar (RF-2). Cierre con `Escape`. Controles `+`/`-`/eliminar con `aria-label` en español ("Aumentar cantidad de <nombre>", "Disminuir cantidad de <nombre>", "Eliminar <nombre> del carrito"). Foco visible con token `ring`. Nada depende solo del color. Todo operable por teclado.
- **RNF-5 Movimiento.** Apertura/cierre con duración `base` 250 ms y curva estándar (Spec 00 RF-6). Sin bucles. Con `prefers-reduced-motion: reduce`, sin animación de deslizamiento y contenido visible de inmediato (`MotionConfig reducedMotion="user"`).
- **RNF-6 Separación lógica/UI.** Cálculos, operaciones y persistencia en funciones puras y hooks (`src/logic/`, `src/context/`) desacoplados de presentación (constitución §3).
- **RNF-7 Tests.** Lógica pura (agregar, actualizar, remover, vaciar, totales, formato CLP, load/save con Zod y revalidación) con tests Vitest (constitución §4).
- **RNF-8 Dependencias.** Sin librerías nuevas. Solo React 19, Tailwind v4, Zod y `lucide-react` existentes. Sin Radix Dialog, Vaul, Zustand ni similares.

## Casos límite
- Agregar repetidamente el mismo producto: incrementa sin duplicar filas, sin tope (cubierto por RF-3).
- Decrementar con cantidad 1: elimina el ítem (cubierto por RF-4).
- `localStorage` con JSON inválido o esquema viejo: se descarta y se inicia vacío sin excepciones (cubierto por RF-7).
- `localStorage` deshabilitado o cuota excedida: opera en memoria sin crashear (cubierto por RF-7).
- Producto guardado eliminado del catálogo: se descarta al cargar (cubierto por RF-7).
- Producto guardado con precio cambiado: se actualiza al valor del catálogo (cubierto por RF-7).
- Total mayor a 99 unidades: badge muestra "99+" (cubierto por RF-1).
- Clic en backdrop o `Escape`: cierra sin alterar el carrito (cubierto por RF-2).
- Activar "Agregar" en tarjeta: agrega sin navegar al detalle (cubierto por RF-3).
- Navegar con panel abierto ("Explorar catálogo"): el panel se cierra (cubierto por RF-2, RF-6).
- Sin conexión: funcionamiento idéntico por ser estático (RNF-2).

## Fuera de alcance
- Pasarela de pago real (Webpay, Transbank, Stripe) o procesamiento bancario; "Finalizar compra" es solo cierre mock (RF-9).
- Stock/inventario dinámico validado contra base de datos; sin tope en esta fase.
- Autenticación o sincronización en la nube / entre dispositivos y entre pestañas.
- Cupones, despacho, impuestos adicionales.
- Página dedicada `/carrito`; solo panel lateral.
- Selector de cantidad en detalle o tarjetas.
- Backend, API, MongoDB/Mongoose, catálogo dinámico.
- Despliegue y producción.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. `products.json` y Zod incluyen `price` entero positivo con los valores sancionados (RF-8).
2. Detalle muestra precio y "Agregar al carrito"; tarjetas muestran precio y "Agregar" fuera del `Link` sin navegar al agregar (RF-3, RF-8).
3. El botón del `Header` muestra badge (1–99 número, más de 99 "99+"), oculto en 0, y abre el drawer sin cambiar URL con `aria-expanded` correcto (RF-1, RF-2).
4. El panel permite incrementar, decrementar (en 1 elimina) y eliminar con papelera (RF-4).
5. Subtotal y total se calculan al instante y se muestran en formato chileno sin errores de flotante (RF-5).
6. Vacío muestra "Tu carrito está vacío." con "Explorar catálogo" que cierra y va a `#/catalogo`, sin totales ni acciones (RF-6).
7. "Vaciar carrito" limpia directo y "Finalizar compra" solo cierra sin red ni cambios (RF-9).
8. El carrito persiste en `localStorage` clave `cart`, revalida contra catálogo, tolera corrupto/deshabilitado y recarga sin perder selección válida (RF-7).
9. El panel cumple diseño "IDE institucional", responsive 360px–desktop, foco atrapado/retornado, `Escape`, etiquetas en español y movimiento reducido (RNF-3, RNF-4, RNF-5).
10. La lógica pura tiene tests Vitest (RNF-7).
11. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Tipo de interfaz: panel lateral (drawer) derecho, no página separada.
- [RESUELTO] Origen de agregado: detalle ("Agregar al carrito") y tarjetas de catálogo/inicio ("Agregar" fuera del `Link`, con `aria-label="Agregar <nombre> al carrito"`).
- [RESUELTO] Cantidad: siempre +1 por activación, sin selector ni tope máximo.
- [RESUELTO] Precios: enteros CLP en `products.json` (6000/12000/1500), validados `z.number().int().positive()`, mostrados en detalle y tarjetas con `Intl.NumberFormat('es-CL')`.
- [RESUELTO] Persistencia: solo frontend en `localStorage` clave `cart`; al cargar se revalida (descarta ids inexistentes, actualiza nombre/precio/imagen del catálogo, corruptos → `[]`); sin sync entre pestañas; fallback en memoria si deshabilitado/cuota.
- [RESUELTO] Badge: suma de unidades; oculto en 0; "99+" sobre 99.
- [RESUELTO] Pie del drawer: "Vaciar carrito" limpia directo sin confirmar; "Finalizar compra" mock que solo cierra el panel.
- [RESUELTO] Drawer: responsive (`calc(100vw - 32px)` en móvil, máx 420 px desktop), animación `base` 250 ms con `reduced-motion` sin animación, body lock, cierra con ✕/backdrop/`Escape` y al navegar, retorna foco al activador.
- [RESUELTO] Rutas visibles con `HashRouter`: `#/catalogo`, `#/producto/:id`; abrir/cerrar drawer no cambia la URL salvo "Explorar catálogo".
