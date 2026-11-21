# Spec 014 — Variantes de producto

## Contexto y objetivo

La spec 008 convirtió el catálogo en productos persistidos en MongoDB, pero dejó
explícitamente fuera las variantes y el stock. Actualmente cada producto tiene
un único precio, imagen y cantidad disponible implícita: el carrito permite
agregar unidades sin límite y el pedido solo identifica el producto.

Esta spec agrega variantes vendibles al modelo `Product`. Una variante
representa una opción concreta o combinación de opciones que el comprador puede
elegir (por ejemplo, `Rojo / M`), con identificador, nombre visible y stock
entero propio. El precio y la imagen siguen siendo comunes a todas las
variantes del producto. La selección se exige en el detalle y se conserva en el
carrito y en el snapshot del pedido; el servidor valida y descuenta stock al
crear el pedido.

Modifica 008 (modelo, contratos, publicación, edición y detalle), 004
(carrito), 012 (creación del pedido y snapshot) y 013 (listado administrativo).
Las specs anteriores quedan como línea base histórica y no se editan en esta
fase.

Lo que NO incluye: precios distintos por variante, imágenes distintas,
atributos estructurados separados (talla/color como campos independientes),
stock global adicional al stock de las variantes, reservas temporales,
devoluciones, cancelaciones ni administración avanzada de inventario.

## Usuarios

- **Vendedor**: persona autenticada que crea y mantiene las variantes y su stock.
- **Comprador**: persona que elige una variante disponible, la agrega al carrito
  y compra unidades sin superar su stock.
- **Administrador**: persona con rol `admin` que visualiza y modera productos
  respetando sus variantes.
- **Desarrollador/es**: implementa los contratos compartidos, persistencia,
  reglas de inventario y UI conforme al stack existente.

## Historias de usuario

- Como vendedor, quiero definir variantes con stock al publicar un producto,
  para vender opciones concretas como tallas o colores.
- Como vendedor, quiero editar el nombre y stock de mis variantes, para mantener
  el inventario actualizado.
- Como comprador, quiero elegir una variante antes de agregar un producto, para
  recibir exactamente la opción que seleccioné.
- Como comprador, quiero que el carrito muestre la variante y limite la
  cantidad a su stock, para no intentar comprar unidades agotadas.
- Como comprador, quiero que el pedido conserve la variante comprada, para
  identificarla aunque el producto cambie después.
- Como administrador, quiero ver las variantes y su stock al revisar productos,
  para conocer su disponibilidad.

## Requisitos funcionales

**RF-1 — Modelo de variante.**
Cuando se persista un producto con variantes, el sistema deberá guardar sus
variantes embebidas en el documento `Product`.

Criterios de aceptación:

- Cuando se cree una variante, deberá contener `id` estable, `name` visible
  recortado de 1 a 80 caracteres y `stock` entero entre 0 y 999999.
- Cuando un producto tenga variantes, sus ids deberán ser únicos dentro del
  producto y su nombre no deberá repetirse ignorando mayúsculas y espacios.
- Cuando se actualice una variante existente, su `id` deberá conservarse.
- Cuando un producto se lea, su precio e imagen deberán aparecer una sola vez
  en el producto y no dentro de cada variante.
- Cuando un producto existente no tenga variantes, la migración deberá crear
  una variante base con nombre `"Base"` y stock inicial `1000`; los productos
  nuevos no deberán persistirse sin al menos una variante.

**RF-2 — Publicación y edición con variantes.**
Cuando un vendedor cree o edite un producto, el sistema deberá validar y
persistir su lista de variantes.

Criterios de aceptación:

- Cuando se publique un producto vendible con variantes, el formulario deberá
  permitir agregar, editar y quitar variantes antes de guardar.
- Cuando un producto use variantes, deberá tener al menos una variante y cada
  variante deberá tener nombre y stock válidos.
- Cuando se cree o edite un producto, la entrada deberá aceptar variantes pero
  no deberá aceptar ids de producto, vendedor, destacados ni campos
  desconocidos para asignarlos por _mass assignment_.
- Cuando se elimine una variante que tenga unidades en un carrito, el carrito
  deberá descartarla o marcarla no disponible al volver a validarse, sin
  modificar pedidos ya creados.
- Cuando se edite el nombre o stock de una variante, el cambio deberá verse en
  la siguiente lectura del producto.
- Cuando el último stock disponible de una variante sea `0`, la variante deberá
  seguir visible pero no deberá poder agregarse al carrito.

**RF-3 — Contrato público y validación compartida.**
Cuando la API responda un producto, deberá incluir sus variantes públicas y los
esquemas de `@tiendadcc/utils` deberán validar entradas y respuestas.

Criterios de aceptación:

- Cuando se valide un producto público, `variants` deberá ser una lista de
  `{ id, name, stock }`.
- Cuando se valide una entrada de producto, `variants` deberá rechazar ids
  duplicados, nombres duplicados, stock decimal, stock negativo y cantidades
  fuera del límite.
- Cuando una entrada no incluya variantes, el esquema deberá aplicar la regla
  definida para productos sin opciones y devolver un error en español si no
  puede venderse sin selección.
- Cuando el backend reciba variantes inválidas, deberá responder `400` con
  `fieldErrors` en español y no deberá modificar el producto.

**RF-4 — Selección de variante en el detalle.**
Cuando el comprador visualice un producto con variantes, el detalle deberá
permitir elegir una variante antes de comprar.

Criterios de aceptación:

- Cuando el detalle muestre variantes, deberá presentar un control etiquetado
  "Variante" con el nombre de cada opción y su disponibilidad.
- Cuando una variante tenga stock `0`, deberá mostrarse como agotada, no deberá
  poder seleccionarse y deberá comunicarse además del color.
- Cuando el comprador intente agregar sin seleccionar una variante, deberá ver
  "Selecciona una variante." y no deberá modificarse el carrito.
- Cuando el producto tenga la variante base automática, esta deberá aparecer
  seleccionada como `"Base"` y podrá agregarse sin una selección adicional.
- Cuando el comprador seleccione una variante disponible, el botón de agregar
  deberá permitir la acción y mostrar el stock restante o un mensaje
  equivalente accesible.

**RF-5 — Carrito identificado por variante.**
Cuando el comprador agregue un producto con variante, el carrito deberá
identificar la línea por el par `productId` + `variantId`.

Criterios de aceptación:

- Cuando se agregue dos veces la misma variante, deberá mantenerse una sola
  línea y aumentar su cantidad sin superar el stock actual.
- Cuando se agreguen dos variantes distintas del mismo producto, deberán
  aparecer en líneas separadas.
- Cuando se muestre una línea, deberá incluir el nombre de la variante, la
  cantidad y el stock disponible; el precio seguirá viniendo del producto.
- Cuando se incremente una línea hasta su stock, el control de incremento deberá
  quedar deshabilitado y deberá informarse "No hay más stock disponible.".
- Cuando la cantidad guardada supere el stock actual o la variante ya no exista,
  la línea deberá eliminarse o ajustarse a una cantidad válida al revalidar el
  carrito, sin excepción no controlada.
- Cuando el carrito se sincronice con la cuenta, deberá persistir también
  `variantId` y `quantity`; dos variantes del mismo producto no deberán
  fusionarse.

**RF-6 — Creación del pedido y descuento atómico.**
Cuando el comprador confirme el pago, el servidor deberá validar cada variante,
comprobar stock y descontarlo atómicamente antes de crear el pedido.

Criterios de aceptación:

- Cuando `POST /api/orders` reciba una línea, deberá exigir `productId`,
  `variantId` y `quantity`; el cliente no deberá enviar precio, subtotal ni
  stock.
- Cuando una línea no encuentre el producto o la variante, el servidor deberá
  responder `400` en español y no deberá crear el pedido.
- Cuando una línea solicite más unidades que el stock, el servidor deberá
  responder `409` con una explicación en español y no deberá vaciar el carrito.
- Cuando todas las líneas tengan stock suficiente, el servidor deberá
  descontar las cantidades y crear el pedido sin permitir que una carrera
  concurrente deje stock negativo.
- Cuando falle una validación o actualización de stock, no deberá crearse un
  pedido parcialmente aplicado; el comportamiento transaccional concreto se
  definirá en el plan según las capacidades MongoDB existentes.
- Cuando se cree el pedido, cada línea deberá guardar `productId`, `variantId`,
  `variantName`, nombre del producto, imagen, precio unitario, cantidad y
  subtotal.
- Cuando el pedido se liste después de la compra, deberá conservar el snapshot
  de la variante aunque el producto o la variante se edite o elimine.

**RF-7 — Lectura y visualización del stock.**
Cuando se consulte el catálogo o el detalle, el sistema deberá mostrar
disponibilidad suficiente para evitar compras imposibles.

Criterios de aceptación:

- Cuando un producto tenga variantes, el contrato público deberá incluir el
  stock de cada variante para que el detalle pueda seleccionar correctamente.
- Cuando todas las variantes estén agotadas, el producto deberá mostrarse como
  agotado y no deberá ofrecer una acción de agregar habilitada.
- Cuando un producto legacy sea leído después de la migración, deberá tener la
  variante base visible y su stock deberá participar en las mismas reglas que
  cualquier otra variante.

**RF-8 — Panel administrativo.**
Cuando el administrador consulte productos, deberá poder conocer sus variantes
y existencias sin cambiar el precio ni la imagen por variante.

Criterios de aceptación:

- Cuando el administrador liste un producto, deberá poder ver sus variantes,
  stock total calculado y cuántas están agotadas.
- Cuando el administrador marque o elimine un producto, la operación deberá
  conservar la limpieza de carritos, favoritos, historial y reseñas definida en
  008 y 013.
- Cuando se modifique el stock desde una operación autorizada, el cambio deberá
  quedar validado por los mismos límites de RF-3.

**RF-9 — Compatibilidad de datos existentes.**
Cuando se despliegue la funcionalidad sobre productos, carritos y pedidos
existentes, el sistema deberá evitar pérdida silenciosa de datos.

Criterios de aceptación:

- Cuando un producto existente no tenga `variants`, el backend deberá
  normalizarlo de forma compatible con la decisión final de RF-2.
- Cuando un carrito antiguo solo tenga `productId` y `quantity`, deberá migrarse
  o rechazarse de forma controlada y explicable, sin romper la aplicación.
- Cuando un pedido antiguo no tenga `variantId`, deberá seguir leyéndose como
  pedido histórico sin inventar una variante inexistente.
- Cuando se ejecute el seed existente, no deberá duplicar variantes ni
  modificar pedidos históricos.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final estará en español;
  identificadores, tipos y campos técnicos estarán en inglés.
- **RNF-2 Stack.** No se agregarán dependencias. Se usarán React 19, Vite,
  Express, MongoDB/Mongoose, Tailwind v4 y Zod existentes.
- **RNF-3 Persistencia.** Toda lectura y escritura de variantes y stock pasará
  por modelos y servicios Mongoose del backend.
- **RNF-4 Separación lógica/UI.** Validación, normalización, cálculos de stock,
  acceso a API y migración de carrito vivirán en `utils/` o `src/logic/`;
  los componentes solo presentarán estado y acciones.
- **RNF-5 Integridad.** La reducción de stock deberá ser atómica y no podrá
  producir existencias negativas bajo solicitudes concurrentes.
- **RNF-6 Accesibilidad.** Selectores, mensajes de agotado, errores y límites
  deberán ser operables por teclado, tener `label`/`aria-describedby` y no
  depender solo del color.
- **RNF-7 Responsividad.** La selección de variantes y el resumen del carrito
  deberán funcionar desde 360 px sin desplazamiento horizontal de la página.
- **RNF-8 Rendimiento.** Las variantes deberán viajar junto al producto; no se
  harán consultas por variante en listados ni consultas N+1 para validar un
  pedido.
- **RNF-9 Tests.** Se agregarán tests de esquemas, normalización de datos,
  carrito, rutas y servicio de pedidos, incluyendo agotamiento, concurrencia
  simulada, variantes duplicadas, migración y aislamiento entre usuarios.

## Casos límite

- Dos compradores intentan comprar la última unidad: solo uno recibe éxito; el
  otro recibe `409` y conserva su carrito (RF-6).
- Se elimina una variante con unidades en carritos: esas líneas se descartan al
  revalidar; los pedidos previos permanecen intactos (RF-2, RF-5, RF-6).
- Se cambia el nombre de una variante después de una compra: el pedido muestra
  el nombre del snapshot anterior (RF-6).
- Todas las variantes tienen stock cero: se muestra el producto, pero no se
  puede agregar (RF-4, RF-7).
- Se agrega la variante A y luego la B del mismo producto: no se fusionan
  líneas (RF-5).
- Un cliente envía `variantId` ajeno a `productId`: el pedido falla con `400`
  y no descuenta stock (RF-6).
- Un cliente envía precio, stock o subtotal manipulado: se ignora o rechaza y
  el servidor calcula con datos persistidos (RF-3, RF-6).
- Un carrito antiguo no tiene `variantId`: se migra o descarta de manera
  controlada, nunca se compra una variante elegida arbitrariamente (RF-9).
- Un pedido histórico no tiene variante: se muestra sin romper el historial
  (RF-9).

## Fuera de alcance

- Precios, imágenes o descripciones diferentes por variante.
- Campos estructurados separados para talla, color, material o capacidad.
- Reservas de stock antes del pago, carritos con expiración o backorders.
- Devoluciones, cancelaciones, reembolsos y movimientos de inventario.
- Historial de cambios de stock, proveedores, bodegas y reportes de inventario.
- Pasarela de pago real, despacho, impuestos, boleta y facturación.
- Cambios a las specs existentes en este paso; sus deltas se implementarán con
  la trazabilidad del plan.

## Criterios de finalización

1. El modelo `Product`, los esquemas Zod y el contrato público soportan
   variantes con ids únicos, nombres válidos y stock no negativo (RF-1, RF-3).
2. Publicar y editar productos permite mantener sus variantes sin mass
   assignment y con errores en español (RF-2).
3. El detalle permite elegir una variante y bloquea variantes agotadas o
   selecciones ausentes (RF-4).
4. El carrito distingue variantes, limita cantidades al stock y conserva la
   selección durante la sincronización (RF-5).
5. El pedido valida variantes, descuenta stock atómicamente y conserva el
   snapshot de cada variante sin aceptar precios del cliente (RF-6).
6. Catálogo, detalle y panel administrativo muestran disponibilidad sin
   consultas N+1 (RF-7, RF-8).
7. Los datos existentes se leen o migran de forma controlada y los pedidos
   históricos no se alteran (RF-9).
8. Se cubren los casos de error, agotamiento y concurrencia con tests según
   RNF-9.
9. `npm run check` pasa sin errores.

## Dudas abiertas

- [RESUELTO] Una variante representa una opción vendible o combinación de
  opciones mediante `{ id, name, stock }`; por ejemplo, `Rojo / M`.
- [RESUELTO] El precio e imagen son comunes al producto y no se duplican en
  las variantes.
- [RESUELTO] El precio base es común al producto y cada variante puede agregar
  un recargo no negativo mediante `priceAdjustment`; el precio efectivo es la
  suma de ambos.
- [RESUELTO] Los recargos iniciales del catálogo son: Poleras S/M/L/XL =
  `$0/$500/$1.000/$1.500`; Tazas 330/450 ml = `$0/$1.000`; Stickers
  Individual/Pack x3 = `$0/$2.500`; Pins Individual/Pack x2 =
  `$0/$1.500`.
- [RESUELTO] Las variantes seleccionadas se guardan en el carrito y en el
  pedido.
- [RESUELTO] Los productos existentes sin variantes se migran a una variante
  base automática llamada `"Base"` con stock inicial de 1000 para conservar su
  capacidad de compra.
- [RESUELTO] Los productos legacy del catálogo reciben variantes iniciales por
  categoría: Poleras (`Talla S`, `Talla M`, `Talla L`, `Talla XL`), Tazas
  (`330 ml`, `450 ml`), Stickers (`Individual`, `Pack x3`) y Pins
  (`Individual`, `Pack x2`), con stock inicial 1000 por variante.
- [RESUELTO] El stock máximo por variante es de 1000 unidades; el nombre máximo
  es de 80 caracteres.
