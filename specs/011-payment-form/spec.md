# Spec 011 — Formulario de pago (mock)

## Contexto y objetivo
Actualmente la tienda permite armar un carrito en un panel lateral (`specs/004-shopping-cart`): con artículos presentes, el pie del panel muestra "Vaciar carrito" y "Finalizar compra". Según 004 RF-9, "Finalizar compra" vacía el carrito y cierra el panel **sin navegar ni cobrar**.

Esta spec define el **flujo de pago mock**: al activar "Finalizar compra", el sistema navega a una ruta dedicada `#/pago` que muestra, **arriba**, un resumen de solo lectura de lo que se está comprando (los mismos datos del drawer) y, **abajo**, un formulario de pago con correo, número de tarjeta, vencimiento, CVC y nombre del titular. Al pulsar "Pagar" (mock, siempre exitoso), se vacía el carrito y se muestra una pantalla de éxito en la misma ruta. La ruta `#/pago` exige sesión: un comprador anónimo es enviado a iniciar sesión y, tras entrar, vuelve a `#/pago`.

Esta spec **reemplaza** el comportamiento de "Finalizar compra" definido en 004 RF-9 (ya no vacía el carrito ni cierra el panel sin navegar; el vaciado ocurre al confirmar el pago). La 004 no se edita aún; su actualización se hará al implementar esta spec.

Lo que NO incluye aún: pasarela de pago real, cargos bancarios, backend o API de pagos, persistencia de órdenes.

## Usuarios
- **Comprador / Estudiante autenticado**: persona con sesión iniciada que quiere cerrar su compra desde el carrito.
- **Comprador anónimo**: persona sin sesión que pulsa "Finalizar compra"; debe iniciar sesión antes de pagar (y volver a `#/pago` después).
- **Desarrollador/es**: (implícito) quien implementa la funcionalidad; requiere criterios verificables, separación lógica/UI y tests.

## Historias de usuario
- Como comprador, quiero que "Finalizar compra" me lleve a una página de pago, para revisar y confirmar mi pedido.
- Como comprador, quiero ver arriba qué estoy comprando con cantidades y total, para verificar antes de pagar.
- Como comprador, quiero un formulario de tarjeta con validación clara en español, para evitar errores al pagar.
- Como comprador sin sesión, quiero que se me pida iniciar sesión y volver al pago después, para no perder mi intención de compra.
- Como comprador, quiero ver una confirmación tras pagar, para saber que la compra fue exitosa.

## Requisitos funcionales

**RF-1 — "Finalizar compra" navega a #/pago.**
Cuando el usuario active "Finalizar compra" en el drawer con al menos un artículo, el sistema deberá navegar a `#/pago` sin vaciar el carrito ni cerrar sesión.
Criterios de aceptación:
- Cuando el usuario active "Finalizar compra" con 1 o más artículos, deberá navegarse a `#/pago`.
- Cuando se navegue a `#/pago`, el carrito deberá conservar exactamente sus artículos y cantidades hasta que el pago se confirme.
- Cuando se navegue a `#/pago`, el drawer deberá cerrarse automáticamente (ya ocurre al cambiar la URL, spec 004 RF-2).
- Cuando el usuario esté en `#/pago`, la URL deberá ser `#/pago` (HashRouter, sin recarga).

**RF-2 — Ruta #/pago protegida y retorno tras login.**
Mientras la sesión no esté autenticada, el sistema deberá impedir el acceso a `#/pago` y exigir inicio de sesión.
Criterios de aceptación:
- Cuando un usuario anónimo navegue a `#/pago` (directa o desde el drawer), deberá ser redirigido a `/iniciar-sesion`.
- Cuando la sesión se esté restaurando (estado `loading`), `#/pago` no deberá renderizar el formulario ni el resumen.
- Cuando el usuario inicie sesión correctamente desde ese flujo, deberá volver a `#/pago`, no a la página de inicio.
- Cuando el usuario cierre sesión estando en `#/pago`, deberá salir de `#/pago` (comportamiento de la ruta protegida).

**RF-3 — Resumen de compra (solo lectura) arriba del formulario.**
Mientras el usuario visualice `#/pago`, el sistema deberá mostrar arriba el resumen del pedido, con los mismos datos que el drawer y sin controles de edición.
Criterios de aceptación:
- Cuando haya artículos en el carrito, deberá mostrarse la lista con imagen, nombre, precio unitario, cantidad y subtotal por línea (precio × cantidad).
- Cuando haya artículos en el carrito, deberá mostrarse el total general en pesos chilenos con `Intl.NumberFormat('es-CL')` (p. ej. `$6.000`). Este total también deberá mostrarse en el botón "Pagar" del formulario (RF-5).
- Cuando se muestre el resumen, no deberán mostrarse controles de cantidad (`+`/`-`), eliminar, vaciar ni "Finalizar compra".
- Cuando cualquier artículo cambie en el carrito antes de pagar, el resumen deberá reflejarlo (mismo estado compartido del carrito).

**RF-4 — Carrito vacío en #/pago.**
Cuando `#/pago` se renderice sin artículos y sin éxito previo, el sistema deberá redirigir a `#/catalogo`.
Criterios de aceptación:
- Cuando el carrito esté vacío al cargar `#/pago`, deberá redirigirse a `#/catalogo` (sin mostrar el formulario).
- Cuando el usuario recargue la página en `#/pago` con carrito vacío, deberá ocurrir la misma redirección.
- Cuando se haya mostrado la pantalla de éxito (RF-8), la redirección por carrito vacío no deberá aplicar.

**RF-5 — Formulario de datos de pago.**
Mientras haya artículos en `#/pago`, el sistema deberá mostrar el formulario con correo, número de tarjeta, vencimiento, CVC y nombre del titular, en disposición vertical (un campo por fila), salvo vencimiento y CVC que comparten una misma fila; el botón "Pagar" va abajo del formulario e indica el monto a pagar.
Criterios de aceptación:
- Cuando el usuario esté autenticado, el campo correo deberá precargarse con el correo de la sesión (`PublicUser.email`) y ser editable.
- Cuando se visualice el formulario, deberá mostrarse el encabezado "Método de pago" arriba del primer campo (misma jerarquía visual que "Resumen de compra"), y ser la referencia accesible del formulario (`aria-labelledby`).
- Cuando se visualice el formulario, los campos deberán disponerse en vertical, un valor por fila.
- Cuando se visualicen los campos de vencimiento y CVC, deberán mostrarse en una misma fila (dos columnas).
- Cuando el usuario escriba el número de tarjeta, deberá visualizarse con espacios cada 4 dígitos (p. ej. `4111 1111 1111 1111`), aunque internamente se valide solo con dígitos.
- Cuando el número de tarjeta empiece por `4`, deberá detectarse y mostrarse como Visa; por `51`–`55` o `2221`–`2720`, Mastercard; por `34` o `37`, American Express; en otro caso, no se muestra marca o se muestra "Tarjeta" genérica.
- Cuando la marca detectada sea American Express, el número deberá aceptar 15 dígitos; en cualquier otro caso, 16 dígitos.
- Cuando el usuario pegue un número con espacios o guiones, deberá normalizarse a dígitos para validarlo.
- Cuando el número de tarjeta tenga la longitud completa esperada (16, o 15 si Amex) y contenga solo dígitos, deberá mostrarse un check en verde (p. ej. icono `Check` de `lucide-react`, color verde) dentro o junto al campo; cuando la longitud sea menor o contenga caracteres no válidos, el check no deberá mostrarse.
- Cuando se visualice el formulario, el botón "Pagar" deberá mostrarse abajo del formulario (al final, después del titular) e indicar el monto a pagar en formato chileno, p. ej. "Pagar $18.000".
- Cuando el monto total cambie (p. ej. el carrito se modifica en otra pestaña), el texto del botón "Pagar" deberá reflejar el nuevo total.
- Cuando se muestre el formulario, el orden de tabulación deberá ser: correo, número de tarjeta, vencimiento, CVC, titular, botón "Pagar $<total>".

**RF-6 — Validación del formulario (Zod, básica).**
Cuando el usuario envíe el formulario, el sistema deberá validar cada campo con Zod y mostrar errores en español; no se aplica el algoritmo de Luhn.
Criterios de aceptación:
- Cuando el correo no sea un email válido, deberá mostrarse un mensaje de error y no deberá procesarse el pago.
- Cuando el titular esté vacío o contenga solo espacios, deberá mostrarse "Ingresa el nombre del titular." y no deberá procesarse el pago.
- Cuando el número de tarjeta no tenga solo dígitos y la longitud esperada (16, o 15 para Amex), deberá mostrarse un mensaje de error y no deberá procesarse el pago.
- Cuando el vencimiento no tenga formato `MM/AA`, mes fuera de `01`–`12` o sea un mes anterior al actual, deberá mostrarse un mensaje de error y no deberá procesarse el pago.
- Cuando el vencimiento sea el mes actual, deberá considerarse válido.
- Cuando el CVC no tenga 3 o 4 dígitos, deberá mostrarse un mensaje de error y no deberá procesarse el pago.
- Cuando un campo sea inválido, su input deberá marcar `aria-invalid="true"` y el error deberá asociarse mediante `aria-describedby`.
- Cuando todos los campos sean válidos, el pago se procesa según RF-7.

**RF-7 — Pago mock siempre exitoso.**
Cuando el formulario sea válido y el usuario active "Pagar", el sistema deberá completar el pago sin demora, sin llamadas de red y sin posibilidad de rechazo.
Criterios de aceptación:
- Cuando el usuario active "Pagar" con el formulario válido, no deberán ocurrir peticiones de red ni escrituras en base de datos.
- Cuando el pago se procese, el carrito deberá vaciarse por completo (misma lógica que "Vaciar carrito", spec 004 RF-9).
- Cuando el pago se procese, el estado del formulario (número de tarjeta, CVC) deberá descartarse y nunca persistirse.
- Cuando el pago se procese, no deberá mostrarse estado de carga ni error de pago posible.

**RF-8 — Pantalla de éxito.**
Cuando el pago se procese, el sistema deberá reemplazar el formulario por una pantalla de éxito en la misma ruta `#/pago`.
Criterios de aceptación:
- Cuando el pago se procese, deberá mostrarse el mensaje "¡Compra realizada con éxito!".
- Cuando el pago se procese, deberá mostrarse el monto total pagado en formato chileno (`Intl.NumberFormat('es-CL')`).
- Cuando el pago se procese, no deberá mostrarse el formulario ni el resumen de artículos editable.
- Cuando se muestre la pantalla de éxito, deberá mostrarse un botón "Volver a la tienda" que navegue a `/`.
- Cuando se muestre la pantalla de éxito, el carrito deberá estar vacío (RF-7) y no deberá dispararse la redirección de RF-4.
- Cuando se muestre la pantalla de éxito, no deberá mostrarse número de orden ni folio (no existe backend de órdenes).

**RF-9 — Seguridad de los datos de tarjeta.**
Mientras el usuario interactúe con el formulario, los datos de tarjeta deberán permanecer únicamente en memoria del cliente.
Criterios de aceptación:
- Cuando se ingresen datos de tarjeta, no deberán persistirse en `localStorage`, `sessionStorage` ni cookies.
- Cuando se ingresen datos de tarjeta, no deberán enviarse a ningún endpoint ni ser registrados en consola.
- Cuando el usuario salga de `#/pago` o se muestre el éxito, los datos del formulario deberán descartarse.
- Cuando se rendericen los campos, deberán usarse atributos `autocomplete` adecuados: `cc-email`, `cc-number`, `cc-exp`, `cc-csc`, `cc-name`.

**RF-10 — Accesibilidad del formulario.**
Mientras el usuario visualice el formulario, el sistema deberá ofrecer etiquetas asociadas, foco visible y errores anunciables.
Criterios de aceptación:
- Cuando se renderice un campo, deberá existir un `<label>` asociado (htmlFor/id) con texto en español.
- Cuando se muestre un error, deberá ser anunciable (p. ej. `role="alert"` o `aria-live`).
- Cuando el usuario navegue solo con teclado, todos los campos y el botón "Pagar" deberán ser alcanzables y operables.
- Cuando un campo reciba foco, deberá mostrarse un anillo de foco visible con el token `ring`.

## Requisitos no funcionales
- **RNF-1 Idioma.** Todo texto orientado al usuario final en español (constitución §6). Identificadores, tipos y funciones en inglés.
- **RNF-2 Sin backend ni red para el pago.** El pago opera solo en cliente: sin peticiones de red ni escrituras en base de datos (constitución §1, §5). La sesión usa el flujo de autenticación existente.
- **RNF-3 Sistema de diseño "IDE institucional".** Respeta `specs/00-design-system/spec.md`: superficie `card`, bordes y texto semánticos, primitivas `Button`, `Input`, `Label` y `Card` de `src/components/ui/`, precios en `font-mono`, tema oscuro único sin selector.
- **RNF-4 Responsive.** Columna única (resumen arriba, formulario abajo) en 360 px–escritorio, con ancho máximo de lectura en escritorio; sin desplazamiento horizontal en 360 px. La fila vencimiento + CVC se mantiene como dos columnas también en 360 px.
- **RNF-5 Separación lógica/UI.** Validación Zod, formato de tarjeta, detección de marca y cálculo/formato de totales en funciones puras y hooks (`src/logic/`) desacoplados de la presentación (constitución §3). Se reutiliza `formatPriceCLP` y el estado del carrito existente.
- **RNF-6 Tests.** Lógica pura (formato con espacios, normalización a dígitos, detección de marca, esquema Zod de pago, cálculo de vencimiento válido, total pagado) con tests Vitest (constitución §4).
- **RNF-7 Dependencias.** Sin librerías nuevas. Solo React 19, Tailwind v4, Zod, `lucide-react` y las primitivas existentes (constitución §1).
- **RNF-8 Movimiento.** Transiciones que existan usan duración `base` 250 ms; con `prefers-reduced-motion: reduce`, sin animaciones no esenciales.

## Casos límite
- Carrito vacío al entrar a `#/pago` (o al recargar): redirección a `#/catalogo` (cubierto por RF-4).
- Éxito visible con carrito vacío: no aplica la redirección de RF-4 (cubierto por RF-8).
- Comprador anónimo pulsa "Finalizar compra" o entra directo a `#/pago`: redirige a login y vuelve a `#/pago` tras entrar (cubierto por RF-2).
- Vencimiento igual al mes actual: válido; mes anterior: inválido (cubierto por RF-6).
- Tarjeta American Express: 15 dígitos válidos; Visa/Mastercard: 16 (cubierto por RF-5, RF-6).
- Número pegado con espacios o guiones: se normaliza a dígitos y valida (cubierto por RF-5).
- Número de tarjeta con la longitud completa (16, o 15 si Amex): check verde visible; al borrar o quedar incompleta, desaparece (cubierto por RF-5).
- Tarjeta de otra longitud o con letras: sin check verde y error al enviar (cubierto por RF-5, RF-6).
- Doble activación de "Pagar": una sola limpieza del carrito; el formulario ya no existe tras el éxito, por lo que no hay doble procesamiento (cubierto por RF-7, RF-8).
- Datos de tarjeta nunca tocan `localStorage` ni la red (cubierto por RF-9).
- Sin conexión: el flujo completo funciona igual, por ser 100% cliente (RF-7).

## Fuera de alcance
- Pasarela de pago real (Webpay, Transbank, Stripe) o procesamiento bancario; el pago es siempre exitoso (RF-7).
- Backend, API, MongoDB/Mongoose o persistencia de órdenes; sin folio ni número de orden (RF-8).
- Guardar tarjetas, "pagar con tarjeta guardada", facturación y boleta.
- Stock/inventario, cupones, despacho, impuestos y dirección de envío.
- Edición de cantidades o eliminación de artículos desde `#/pago` (solo lectura, RF-3).
- Luhn u otras verificaciones criptográficas del número de tarjeta (validación básica, RF-6).
- Registro de usuario dentro del flujo de pago.
- Despliegue y producción.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. "Finalizar compra" en el drawer navega a `#/pago` sin vaciar el carrito (RF-1).
2. `#/pago` está protegida: anónimo → `/iniciar-sesion` y retorno a `#/pago` tras login; durante restauración de sesión no renderiza (RF-2).
3. El resumen arriba muestra imagen, nombre, cantidad, subtotal por línea y total en CLP, en solo lectura (RF-3).
4. Con carrito vacío se redirige a `#/catalogo`; tras el éxito no aplica esa redirección (RF-4, RF-8).
5. El formulario precarga el correo de la sesión (editable), se dispone en vertical con vencimiento y CVC en una misma fila, formatea la tarjeta en grupos de 4 con detección Visa/Mastercard/Amex, muestra check verde al completar el largo esperado y ordena la tabulación de forma lógica (RF-5).
6. La validación Zod básica muestra errores en español, con `aria-invalid`/`aria-describedby`, sin Luhn (RF-6).
7. El botón "Pagar" muestra el monto a pagar (p. ej. "Pagar $18.000"), sincronizado con el total del resumen (RF-3, RF-5).
8. "Pagar" siempre tiene éxito, sin red ni demora, vacía el carrito y descarta los datos de tarjeta (RF-7, RF-9).
9. Tras pagar se muestra "¡Compra realizada con éxito!" con el monto total y botón "Volver a la tienda" → `/` (RF-8).
10. Etiquetas y errores accesibles en español, operable por teclado, foco visible (RF-10).
11. La lógica pura tiene tests Vitest (RNF-6) y la separación lógica/UI se respeta (RNF-5).
12. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Ubicación: ruta dedicada `#/pago` (HashRouter), no modal ni overlay.
- [RESUELTO] Contenido del resumen: igual que el drawer (imagen, nombre, cantidad, subtotal por línea y total en CLP), en solo lectura, arriba del formulario.
- [RESUELTO] Validación: Zod básica sin Luhn (email válido, tarjeta solo dígitos, vencimiento MM/AA vigente, CVC 3–4 dígitos), con el titular sin poder quedar vacío.
- [RESUELTO] Acceso: ruta protegida; sin sesión se redirige a `/iniciar-sesion` y tras login exitoso se retorna a `#/pago`.
- [RESUELTO] Correo: precargado con `PublicUser.email` cuando hay sesión, editable.
- [RESUELTO] Extras del formulario: formato con espacios en grupos de 4 y detección de marca Visa (`4`), Mastercard (`51`–`55`, `2221`–`2720`) y American Express (`34`/`37`, 15 dígitos); sin mostrar/ocultar CVC.
- [RESUELTO] Resultado del pago: siempre exitoso, inmediato, sin llamadas de red.
- [RESUELTO] Tras pagar: pantalla de éxito dentro de `#/pago` con monto pagado, carrito vaciado, botón "Volver a la tienda" → `/`, sin folio.
- [RESUELTO] Disposición del formulario: vertical, un valor por fila; vencimiento y CVC comparten una misma fila (dos columnas, también en 360 px); botón "Pagar" abajo del formulario e indica el monto a pagar (p. ej. "Pagar $18.000"), sincronizado con el total del resumen; check en verde junto al número de tarjeta al completar la longitud esperada.
- [ASUMIDO] Carrito vacío en `#/pago` (incluida recarga): redirección a `#/catalogo`, consistente con "Explorar catálogo" del estado vacío del drawer.
- [ASUMIDO] Vencimiento válido cuando mes/año ≥ mes/año actual; formato `MM/AA`; el mes actual se considera vigente.
- [ASUMIDO] American Express con 15 dígitos; Visa/Mastercard y cualquier otra marca con 16 dígitos.
- [ASUMIDO] La pantalla de éxito vive en la misma ruta `#/pago` (sin ruta `/exito`); la redirección por carrito vacío no aplica mientras el éxito esté visible.
- [PENDIENTE — hablarlo con el equipo] Inconsistencia de instalación/`node_modules` detectada el 2026-11-09: el lock anida `jsdom` en `apps/frontend/client/node_modules/jsdom` pero homologa `vitest` a la raíz (`node_modules/vitest`), por lo que un `npm ci` o un `npm install` limpio con npm nuevo deja a `vitest` sin poder resolver `jsdom` y los tests del frontend corren 0 archivos ("Cannot find package 'jsdom'"). En esta máquina se resolvió de forma local y temporal con `npm install --no-save jsdom@^26.1.0` (no versiona nada; la solución de raíz sería declarar `jsdom` en el `package.json` raíz o corregir el lock — decisión pendiente del equipo, con actualización de spec previa por las reglas del proyecto). El backend además requería `npm install` inicial: `nodemailer` y `express-rate-limit` estaban declarados en la raíz pero no instalados.
- [NOTA] Esta spec reemplaza 004 RF-9 ("Finalizar compra" ya no vacía el carrito ni cierra el panel sin navegar). La `specs/004-shopping-cart/spec.md` no se edita en este paso; deberá actualizarse al implementar.
