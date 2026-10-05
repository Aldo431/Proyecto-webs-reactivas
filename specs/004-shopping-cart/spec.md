# Spec 004 — Carrito de compras (Panel lateral)

## Contexto y objetivo
Actualmente la tienda permite explorar productos en el inicio y en el catálogo (`specs/003-products-catalog`), así como ver el detalle individual de cada producto (`specs/002-product-detail`). En el encabezado (`Header`), el acceso al carrito existe únicamente como un elemento inactivo reservado para el futuro ("Próximamente"). Asimismo, el catálogo de productos en `products.json` carece actualmente de un campo de precio.

Esta spec define la implementación de un **carrito de compras solo frontend desplegado en un panel lateral (drawer)**. Permite a los usuarios agregar productos desde la vista de detalle, modificar cantidades, eliminar artículos, calcular subtotales y el monto total en pesos chilenos, y persistir la selección del usuario en el navegador mediante `localStorage`.

Para habilitar el cálculo de montos y totales, esta spec sanciona la actualización de `products.json` y del esquema Zod de productos para incorporar la propiedad `price`.

## Usuarios
- **Comprador / Estudiante**: Persona que navega la tienda y desea acumular productos para una compra sin perder el contexto de su navegación.
- **Desarrollador /s**: (Implícito) Quien consume la spec para implementar la funcionalidad; requiere criterios verificables, separación estricta entre lógica e interfaz y pruebas automatizadas.

## Historias de usuario
- Como comprador, quiero ver un botón del carrito en el encabezado con la cantidad total de artículos agregados, para tener visibilidad permanente de mi compra.
- Como comprador, quiero pulsar "Agregar al carrito" en la página de detalle de un producto, para sumarlo a mi selección.
- Como comprador, quiero que al interactuar con el carrito se despliegue un panel lateral sin abandonar la página en la que me encuentro.
- Como comprador, quiero aumentar, disminuir o eliminar productos del carrito en el panel lateral, para ajustar mi pedido antes de finalizar.
- Como comprador, quiero ver el subtotal por producto y el total general calculados en pesos chilenos, para saber exactamente cuánto gastaría.
- Como comprador, quiero que los productos del carrito se conserven al recargar la página o volver al sitio, para no perder mi selección.

## Requisitos funcionales

**RF-1 — Acceso al carrito en el encabezado.**
Cuando el usuario visualice la barra de navegación superior en cualquier vista, el sistema deberá mostrar un botón del carrito interactivo que reemplace el elemento "Próximamente", reflejando el número total de unidades acumuladas.
Criterios de aceptación:
- Cuando el carrito contenga 0 unidades, el botón del carrito deberá mostrar el icono `ShoppingCart` y la etiqueta "Carrito" sin badge numérico.
- Cuando el carrito contenga 1 o más unidades, el botón del carrito deberá mostrar un badge numérico con la suma total de unidades agregadas.
- Cuando el usuario active el botón del carrito mediante clic o teclado (Enter o Espacio), el sistema deberá abrir el panel lateral sin modificar la URL ni recargar la página.
- Cuando el panel lateral esté abierto, el botón del carrito deberá indicar el estado expandido mediante `aria-expanded="true"`.

**RF-2 — Panel lateral (Drawer) del carrito.**
Mientras el panel lateral esté visible, el sistema deberá superponerse como un diálogo lateral derecho sobre la vista actual, con un fondo atenuado (*backdrop*) y controles accesibles de cierre.
Criterios de aceptación:
- Cuando el panel lateral se abra, deberá presentarse anclado al costado derecho de la pantalla con el título "Tu Carrito".
- Cuando el panel lateral esté abierto, el sistema deberá bloquear el desplazamiento del fondo (*body scroll lock*).
- Cuando el usuario presione el botón de cerrar ("✕"), haga clic en el *backdrop* o pulse la tecla `Escape`, el panel lateral deberá cerrarse.
- Cuando el panel lateral se cierre, el sistema deberá restaurar el foco del teclado en el botón del encabezado que lo abrió.

**RF-3 — Agregar producto desde la vista de detalle.**
Cuando el usuario esté en la página de detalle de un producto (`/producto/:id`), el sistema deberá ofrecer un botón visible "Agregar al carrito".
Criterios de aceptación:
- Cuando el usuario active "Agregar al carrito", deberá agregarse 1 unidad del producto correspondiente al carrito.
- Cuando el producto agregado ya exista en el carrito, deberá incrementarse su cantidad en 1 sin generar una fila duplicada.
- Cuando el producto sea agregado exitosamente, el panel lateral deberá abrirse automáticamente para confirmar la acción de forma observable.
- Cuando el producto no exista o la página de detalle muestre "Producto no encontrado", no deberá mostrarse el botón "Agregar al carrito".

**RF-4 — Modificación de cantidades y eliminación.**
Mientras el usuario visualice los artículos en el panel lateral, el sistema deberá permitir incrementar, decrementar o eliminar cada artículo.
Criterios de aceptación:
- Cuando el usuario active el control `+` de un artículo, su cantidad deberá incrementarse en 1 unidad.
- Cuando el usuario active el control `-` de un artículo cuya cantidad sea mayor a 1, su cantidad deberá disminuirse en 1 unidad.
- Cuando el usuario active el control `-` de un artículo cuya cantidad sea 1, el artículo deberá removerse del carrito.
- Cuando el usuario active el botón de eliminar (icono de papelera), el artículo correspondiente deberá removerse inmediatamente del carrito.

**RF-5 — Cálculo y desglose de precios.**
Mientras haya artículos en el carrito, el sistema deberá calcular y mostrar el precio unitario, el subtotal por producto y el total general en pesos chilenos formateados.
Criterios de aceptación:
- Cuando un artículo se agregue o modifique su cantidad, el subtotal de esa línea (`precio * cantidad`) deberá recalcularse y mostrarse de inmediato.
- Cuando cualquier artículo cambie de cantidad o sea eliminado, el monto total general deberá actualizarse de inmediato.
- Cuando los precios se muestren, deberán seguir el formato monetario chileno estándar (p. ej. `$6.000`, `$12.000`).
- Cuando se calculen los totales, no deberán ocurrir errores de coma flotante ni valores negativos.

**RF-6 — Estado vacío del carrito.**
Cuando el carrito no contenga ningún artículo, el sistema deberá mostrar un estado vacío claro que guíe al usuario.
Criterios de aceptación:
- Cuando el carrito no tenga artículos, deberá mostrarse el mensaje "Tu carrito está vacío.".
- Cuando el carrito no tenga artículos, deberá mostrarse un botón "Explorar catálogo" que cierre el panel lateral y navegue a `#/catalogo`.
- Cuando el carrito no tenga artículos, la sección de totales y el botón de acción de compra no deberán mostrarse.

**RF-7 — Persistencia en almacenamiento local.**
Cuando ocurra cualquier cambio en el estado del carrito, el sistema deberá persistir los artículos en `localStorage`.
Criterios de aceptación:
- Cuando la aplicación se inicie o se recargue la página, el carrito deberá restaurarse con los artículos almacenados previamente en `localStorage`.
- Cuando los datos leídos de `localStorage` estén corruptos o no cumplan el esquema Zod esperado, el sistema deberá descartar los datos corruptos, reiniciar el carrito como vacío y no arrojar excepciones no controladas.
- Cuando el usuario vacíe el carrito, `localStorage` deberá actualizarse en consecuencia.

**RF-8 — Actualización del modelo de datos de productos.**
El sistema deberá incorporar el campo `price` en el modelo y esquema de productos.
Criterios de aceptación:
- Cuando los productos se lean desde `products.json`, cada producto deberá incluir la propiedad `price` como un entero positivo en pesos chilenos.
- Cuando se validen los productos con el esquema Zod `ProductSchema`, el campo `price` deberá validarse como número entero positivo.
- Cuando se visualice el detalle del producto (`ProductDetailPage`), el precio del producto deberá mostrarse claramente junto a la descripción y categoría.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto e indicación orientado al usuario final deberá estar en español (constitución, §6). Código, identificadores, tipos y funciones en inglés.
- **RNF-2 Sin backend ni red.** El carrito operará enteramente en el cliente mediante React state y `localStorage`. No se realizarán peticiones de red ni llamadas a APIs externas o bases de datos (constitución, §1, §5).
- **RNF-3 Sistema de diseño "IDE institucional".** La interfaz del drawer respetará la Spec 00 (`specs/00-design-system/spec.md`): fondo oscuro semántico (`--color-ink-900`), bordes terminal, botones consistentes con `Button` de `src/components/ui/button.tsx`, tipografía sans para texto y monoespaciada para valores numéricos y precios.
- **RNF-4 Accesibilidad (a11y).** El panel lateral actuará como un diálogo modal accesible (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`). Se deberá gestionar el foco adecuadamente (atrapar foco dentro del panel mientras esté abierto y retornarlo al botón activador al cerrar). Cerrar con tecla `Escape`.
- **RNF-5 Separación de lógica e interfaz.** La lógica de cálculo, gestión de estado y persistencia del carrito vivirá en funciones puras y custom hooks en `src/logic/` (`cartLogic.ts`, `useCart.ts`, esquemas Zod), desacoplada de la capa visual de presentación (constitución, §3).
- **RNF-6 Tests.** Toda la lógica pura de manipulación del carrito (agregar, remover, actualizar cantidad, calcular totales, serializar/deserializar Zod) deberá contar con pruebas unitarias exhaustivas en Vitest (constitución, §4). `npm run check` deberá pasar sin errores.
- **RNF-7 Dependencias.** No se agregarán librerías externas adicionales. Se utilizarán React 19, Tailwind v4, Zod y los iconos existentes de `lucide-react`.

## Casos límite
- Agregar repetidamente el mismo producto: incrementa unidades sin generar filas duplicadas (cubierto por RF-3).
- Reducir cantidad en un ítem con 1 unidad: elimina el producto del carrito (cubierto por RF-4).
- `localStorage` deshabilitado o con cuota excedida: la aplicación no debe crashear, operando en memoria durante la sesión.
- `localStorage` con contenido JSON inválido o estructura antigua: Zod valida la entrada; si falla, se inicializa como carrito vacío de forma segura (cubierto por RF-7).
- Clic en el backdrop o pulsar Escape: cierra el drawer sin alterar el estado del carrito (cubierto por RF-2).
- Navegación con el panel abierto: si el usuario navega a través de un enlace dentro del panel (ej. "Explorar catálogo"), el panel debe cerrarse automáticamente.

## Fuera de alcance
- Pasarela de pago real (Webpay, Transbank, Stripe) o procesamiento bancario.
- Gestión de inventario/stock dinámico validado contra base de datos.
- Autenticación o sincronización en la nube entre múltiples dispositivos.
- Cupones de descuento, costos de despacho o cálculo de impuestos adicionales.
- Página dedicada `/carrito` (se restringe exclusivamente a panel lateral según lo acordado).

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. `products.json` y el esquema Zod contienen el atributo `price` de tipo entero positivo (RF-8).
2. La vista de detalle del producto muestra el precio formateado y el botón "Agregar al carrito" funcional (RF-3, RF-8).
3. El botón del carrito en el Header muestra el badge de cantidad cuando corresponde y abre el drawer (RF-1, RF-2).
4. El panel lateral permite incrementar, decrementar y eliminar productos (RF-4).
5. El subtotal y el total se calculan con exactitud y se muestran formateados en pesos chilenos (RF-5).
6. El estado vacío se presenta con el botón "Explorar catálogo" (RF-6).
7. El estado del carrito persiste en `localStorage` y se recupera al recargar la página (RF-7).
8. El panel cumple las condiciones de accesibilidad y diseño "IDE institucional" (RNF-3, RNF-4).
9. Las funciones de lógica de carrito cuentan con pruebas unitarias en Vitest (RNF-6).
10. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Tipo de interfaz: Panel lateral (Drawer) sobre la misma pantalla en lugar de una página separada.
- [RESUELTO] Persistencia: Exclusivamente frontend mediante `localStorage`.
- [RESUELTO] Modelo de precios: Se añade `price: number` a `products.json` y al esquema Zod.
- [RESUELTO] Comportamiento al agregar: Al hacer clic en "Agregar al carrito" en el detalle, se suma la unidad y se abre automáticamente el drawer como confirmación visual inmediata.
