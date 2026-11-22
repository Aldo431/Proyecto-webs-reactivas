# Spec 017 — Promociones y packs para alumnos

## Contexto y objetivo
El Hito 3 asignó a este equipo la funcionalidad de **promociones y packs para alumnos**. Hoy la tienda tiene catálogo, carrito en Zustand (spec 015), variantes de producto (spec 014) y un checkout que recalcula precios en el servidor (spec 012), pero no existe ninguna noción de descuento, de alumno ni de promoción. Los nombres de variante `Pack x2`/`Pack x3` que aparecen en el seed son solo etiquetas de inventario: no reducen el precio.

Esta spec agrega: (1) verificación automática del correo institucional de la U. de Chile (dominio `uchile.cl` o subdominios como `ug.uchile.cl` y `dcc.uchile.cl`), (2) un catálogo de promociones administrado por el backend, (3) un endpoint de cotización que aplica el mejor descuento por línea, y (4) la reflejación de precios, ahorro y elegibilidad en catálogo, detalle, carrito y checkout. El precio siempre se calcula en el servidor a partir de la base de datos; el cliente nunca envía montos.

Lo que NO incluye: autenticación de dos factores (spec 018), cupones de texto, bundles de productos distintos con precio fijo, administración visual de promociones, despliegue en `fullstack.dcc.uchile.cl` ni cambios al sistema de diseño.

## Usuarios
- **Alumno/a de la U. de Chile**: usuario con correo institucional verificado (`uchile.cl` o un subdominio como `ug.uchile.cl`); ve precios con descuento y packs disponibles.
- **Visitante u otro comprador**: ve los mismos productos sin descuento de alumno; puede usar los packs de cantidad si aplican.
- **Administrador/a**: crea, edita y desactiva promociones mediante la API.
- **Desarrollador/es** (implícito): consume los esquemas Zod y la función pura de descuentos desde `utils/` y la lógica frontend.

## Historias de usuario
- Como alumno, quiero verificar mi correo U. de Chile, para acceder al descuento de alumno.
- Como alumno, quiero ver el precio final con descuento antes de pagar, para saber cuánto ahorro.
- Como comprador, quiero que los packs de cantidad se apliquen automáticamente, para no tener que buscar un cupón.
- Como administrador, quiero activar o desactivar promociones sin tocar código, para responder a campañas.
- Como desarrollador, quiero una única función pura de descuentos compartida entre cotización y checkout, para que no divergan.

## Requisitos funcionales

**RF-1 — Verificación del correo institucional.**
El sistema deberá permitir a un usuario autenticado verificar que su correo pertenece al dominio institucional `uchile.cl` o a uno de sus subdominios mediante un código enviado a esa dirección.
Criterios de aceptación:
- Cuando un usuario autenticado solicite la verificación con un correo que, normalizado a minúsculas y sin espacios, no tenga como dominio exacto `uchile.cl` ni un subdominio terminado en `.uchile.cl`, deberá responder `400` con el mensaje "Solo se pueden verificar correos institucionales de la U. de Chile." y no deberá enviar código.
- Cuando la solicitud sea válida, deberá generar un código de 6 dígitos, almacenarlo hasheado con expiración de 10 minutos, enviarlo por correo y responder `202` con un mensaje en español; en `development` y `test` la respuesta deberá incluir además el campo `devCode`.
- Cuando el usuario confirme el código correcto antes de la expiración, deberá marcar `studentVerified: true` en su cuenta, borrar el código y responder `200`.
- Cuando el código sea incorrecto o haya expirado, deberá responder `400` con un mensaje en español y no deberá marcar la cuenta como verificada.
- Cuando se acumulen 5 intentos fallidos sobre el mismo código, deberá responder `429`, invalidar el código y exigir una nueva solicitud.
- Cuando se calcule la elegibilidad de alumno, deberá exigir simultáneamente `studentVerified === true` y que el dominio actual del correo sea `uchile.cl` o un subdominio terminado en `.uchile.cl`.

**RF-2 — Catálogo de promociones.**
El sistema deberá persistir promociones configurables con vigencia y estado activo, y exponerlas solo a administradores para su gestión.
Criterios de aceptación:
- Cuando un administrador cree una promoción con `type` igual a `studentDiscount`, `quantityPack3x2` o `quantityPack2x15`, `active: true` y fechas de vigencia opcionales válidas, deberá responder `201` con la promoción creada.
- Cuando el porcentaje de una promoción esté fuera del rango 1–100, o el tipo sea desconocido, o las fechas estén invertidas, deberá responder `400` con `fieldErrors` de Zod.
- Cuando un usuario sin rol `admin` intente crear, editar o desactivar promociones, deberá responder `403`.
- Cuando se consulten las promociones vigentes, deberá devolver solo las activas cuya fecha actual esté dentro de su vigencia, ordenadas por `createdAt` descendente.
- Cuando el seed se ejecute en una base vacía, deberá crear exactamente tres promociones activas: 20% de alumno, pack 3x2 y pack 2 unidades con 15%.

**RF-3 — Cotización de precios.**
El sistema deberá ofrecer un endpoint que reciba solo identificadores y cantidades, y devuelva el desglose de precios calculado en servidor.
Criterios de aceptación:
- Cuando el cliente envíe líneas con `productId`, `variantId` opcional y `quantity` positiva, el servidor deberá leer los precios de la base, aplicar la promoción vigente y responder `200` con `subtotal`, `discounts`, `total` y `savings`.
- Cuando el cuerpo incluya campos de precio (`price`, `unitPrice`, `subtotal`, `total`), deberá responder `400` sin calcular nada.
- Cuando un producto o variante no exista, o la cantidad supere el stock disponible, deberá responder `400` con un mensaje en español.
- Cuando varias promociones apliquen a la misma línea, deberá aplicar solo la de mayor monto en pesos y no deberá acumularlas.
- Cuando el usuario no sea alumno verificado, no deberá aplicar la promoción de alumno, pero sí las promociones de cantidad que correspondan.

**RF-4 — Descuento en el checkout.**
El sistema deberá aplicar exactamente la misma regla de descuento al crear el pedido que al cotizarlo, conservando el desglose en el snapshot.
Criterios de aceptación:
- Cuando se cree un pedido, su `total` deberá ser igual al calculado por el servidor con las promociones vigentes, con independencia de cualquier monto que envíe el cliente.
- Cuando una línea reciba descuento, el snapshot deberá conservar `unitPrice`, `quantity`, `subtotal` final y el objeto `discount` con `type`, `label` y `amount`.
- Cuando las promociones cambien entre la cotización y el pago, el pedido deberá usar las promociones vigentes al momento de pagar y no deberá rechazarse por diferencia con la cotización previa.
- Cuando no aplique ninguna promoción, el pedido deberá conservar el mismo formato con `discount: null`.

**RF-5 — Interfaz de promociones y verificación.**
La interfaz deberá comunicar claramente la elegibilidad, el descuento aplicado y el ahorro total sin confiar en cálculos del navegador.
Criterios de aceptación:
- Cuando el catálogo o el detalle muestren un producto con promoción vigente, deberá exhibir una insignia en español con el beneficio (por ejemplo "20% alumno" o "Pack 3x2").
- Cuando un usuario no verificado tenga un correo institucional de la U. de Chile, deberá verse en el detalle un enlace hacia la verificación con texto en español.
- Cuando el carrito cambie, deberá mostrar el `total` y el `savings` devueltos por la cotización del servidor, y no deberá calcular el total con `logic/cartCalculations.ts` para la vista con descuento.
- Cuando un usuario confirme su código de verificación, la interfaz deberá actualizar el estado sin recargar y volver a cotizar el carrito.
- Cuando la respuesta de envío incluya `devCode` en desarrollo o test, la interfaz no deberá mostrarlo al usuario ni exponerlo en el DOM; el campo queda reservado para las pruebas automatizadas.
- Cuando falle la cotización por indisponibilidad de un producto, el carrito deberá mostrar un mensaje en español y no deberá mostrar un total equivalente a cero.

## Requisitos no funcionales
- **RNF-1 Idioma.** Todo texto orientado al usuario final, incluidos los mensajes de error y las insignias, deberá estar en español (constitución §6). Los identificadores de código van en inglés.
- **RNF-2 Stack.** Se respeta React 19 + Vite, Express, MongoDB/Mongoose, Tailwind v4 + shadcn/Radix y Zod (constitución §1). No se agrega ninguna dependencia nueva: se reutilizan `nodemailer` y `express-rate-limit`, ya presentes en la raíz.
- **RNF-3 Separación lógica/UI.** La decisión de qué descuento aplicar y cuánto cuesta cada línea deberá vivir en funciones puras de `utils/` y `logic/`; los componentes solo presentan resultados (constitución §3).
- **RNF-4 Tests.** La función pura de descuentos, la validación de correo y el ciclo de verificación deberán tener tests unitarios; las rutas nuevas deberán tener tests de integración con supertest; los flujos de alumno y pack deberán tener tests E2E (constitución §4).
- **RNF-5 Seguridad.** El cliente nunca envía precios ni montos de descuento; los códigos de verificación se almacenan hasheados; `devCode` solo se devuelve por API cuando `NODE_ENV !== "production"` y nunca se muestra en la interfaz ni se escribe en logs.
- **RNF-6 Diseño.** Las nuevas vistas y componentes respetan `specs/00-design-system/spec.md`: tokens semánticos, tipografía local, foco visible, movimiento reducido y `HashRouter`.

## Casos límite
- Correo con mayúsculas o espacios: se normaliza antes de comparar el dominio (RF-1).
- Subdominios institucionales como `ug.uchile.cl` y `dcc.uchile.cl`: se aceptan; dominios que solo contienen la cadena `uchile.cl`, como `notuchile.cl` o `uchile.cl.evil.com`, se rechazan (RF-1).
- Código expirado o con 5 intentos fallidos: exige nueva solicitud (RF-1).
- Respuesta de envío con `devCode` en desarrollo/test: la tarjeta confirma el envío pero no renderiza el código (RF-5).
- Usuario que cambia su correo a uno que no pertenece al dominio institucional: deja de ser elegible aunque conserve `studentVerified` (RF-1, RF-3).
- Pack 3x2 con cantidad 1 o 2: sin descuento; con cantidad 6: se bonifican 2 unidades (RF-3).
- Pack 2x15% con cantidad 1: sin descuento; con cantidad 4: 15% sobre las 4 unidades (RF-3).
- Descuento de alumno y pack aplicables a la misma línea: se aplica el de mayor monto en CLP, nunca ambos (RF-3).
- Variante con `priceAdjustment`: el descuento se calcula sobre `product.price + priceAdjustment` (RF-3).
- Redondeo: todos los montos se entregan como enteros CLP usando `Math.round` (RF-3).
- Producto sin stock suficiente: la cotización responde `400`; el carrito no muestra un total de $0 (RF-3, RF-5).
- Cotización válida pero promoción desactivada antes de pagar: el pedido usa la promoción vigente y se guarda el desglose real (RF-4).

## Fuera de alcance
- Autenticación de dos factores (spec 018).
- Cupones de texto, códigos promocionales arbitrarios o porcentajes personalizados por producto.
- Bundles de productos distintos con precio fijo.
- Panel de administración visual para promociones (solo API).
- Despliegue, variables de producción en `fullstack.dcc.uchile.cl` y CI.
- Instalación de MUI, Chakra, Mantine, React-Bootstrap o cualquier otra librería de estilos.
- Modificación de las specs 015 o 016; sus tests E2E sí se amplían con archivos nuevos.

## Criterios de finalización
1. Un usuario con correo institucional de la U. de Chile puede verificarlo por código y queda marcado como `studentVerified` (RF-1).
2. Existen tres promociones sembradas y un administrador puede crear, editar y desactivar promociones vía API con validación Zod (RF-2).
3. `POST /api/pricing/quote` devuelve desglose correcto, ignora montos del cliente con `400` y aplica solo el mejor descuento por línea (RF-3).
4. El checkout usa la misma regla, conserva `discount` en el snapshot y respeta promociones vigentes al pagar (RF-4).
5. Catálogo, detalle, carrito y verificación muestran insignias, ahorro y mensajes en español sin calcular totales en el navegador y sin exponer `devCode` en pantalla (RF-5).
6. No se agregaron dependencias nuevas y no se modificó el design system (RNF-2, RNF-6).
7. Hay tests unitarios, de integración y E2E de los flujos de alumno y pack (RNF-4).
8. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Acreditación de alumno: correo institucional de la U. de Chile (`uchile.cl` o subdominios como `ug.uchile.cl`) verificado con código enviado al correo, sin aprobación manual.
- [RESUELTO] Descuentos: 20% de alumno, pack 3x2 y pack 2 unidades con 15%; no acumulables, se aplica el de mayor monto por línea.
- [RESUELTO] Fuente de verdad de precios: backend con función pura compartida entre cotización y checkout.
- [RESUELTO] Gestión de promociones: solo API para administradores, sin interfaz visual en esta entrega.
- [RESUELTO] Despliegue: fuera de alcance; lo realizan los compañeros del grupo.
- [RESUELTO] Librería de estilos: se mantiene Tailwind v4 + shadcn/Radix por ser la sancionada en `00-design-system`.
- [RESUELTO] Visualización de códigos de desarrollo: `devCode` sigue disponible en la API de development/test para E2E, pero no se muestra en la interfaz de verificación de alumno (RF-5).
