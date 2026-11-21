# Tasks 014 — Variantes de producto

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los
RF que cubre y su criterio "Hecho cuando:". Marco de cierre global:
`npm run check` en verde.

## Fase 0 — Base e inventario

- [ ] **1. Inventariar contratos y consumidores**
    RF: RF-1…RF-9
    Hecho cuando: documento los usos actuales de `Product`, carrito, pedidos,
    publicación/edición y panel admin, y dejo identificados los tests que
    cambiarán antes de editar código.

- [ ] **2. Definir la migración de productos legacy**
    RF: RF-7, RF-9
    Hecho cuando: establezco el identificador estable y el stock inicial de la
    variante base, y existe un test que demuestra que ejecutar la normalización
    dos veces no duplica la variante.

## Fase 1 — Esquemas y lógica pura (depende de 1, 2)

- [ ] **3. Agregar el esquema compartido de variantes**
    RF: RF-1, RF-3
    Hecho cuando: `utils/src/productSchemas.ts` exporta los esquemas y tipos de
    variante, aplica stock máximo 1000, nombres válidos e ids/nombres únicos,
    y sus tests cubren entradas válidas e inválidas.

- [ ] **4. Extender los contratos de producto, carrito y pedido**
    RF: RF-3, RF-5, RF-6, RF-9
    Hecho cuando: los esquemas públicos, de creación/edición, carrito y pedido
    aceptan `variantId`/`variantName` donde corresponde, conservan pedidos
    históricos sin variante y están reexportados desde `utils/src/index.ts`.

- [ ] **5. Implementar `variantLogic` y sus tests**
    RF: RF-1, RF-5, RF-7, RF-9
    Hecho cuando: las funciones puras normalizan la variante base, calculan
    stock total, identifican líneas por `productId` + `variantId` y ajustan
    cantidades sin superar stock; todos sus tests pasan.

## Fase 2 — Modelo y servicios backend (depende de 3, 4, 5)

- [ ] **6. Incorporar variantes embebidas en `Product`**
    RF: RF-1, RF-3
    Hecho cuando: `models/Product.ts` persiste subdocumentos con id, nombre y
    stock, con validadores Mongoose alineados con Zod y sin duplicar precio o
    imagen.

- [ ] **7. Actualizar serialización y escritura de productos**
    RF: RF-2, RF-3, RF-7
    Hecho cuando: creación, edición, lectura y salida pública validan variantes,
    rechazan duplicados/mass assignment y exponen disponibilidad en el contrato.

- [ ] **8. Ejecutar migración y seed de variantes base**
    RF: RF-7, RF-9
    Hecho cuando: productos sin variantes reciben una variante base comprable,
    la operación es idempotente, no altera pedidos y sus tests pasan.

- [ ] **9. Extender carrito persistido y sincronización de perfil**
    RF: RF-5, RF-9
    Hecho cuando: `User.cart`, sus rutas y `profileService` conservan
    `variantId`, separan variantes distintas y migran o descartan líneas legacy
    de forma controlada.

- [ ] **10. Implementar validación y descuento atómico de stock**
    RF: RF-6
    Hecho cuando: `orderService` valida el par producto-variante, rechaza
    faltantes con 400, agotamiento con 409, descuenta sin stock negativo y crea
    el snapshot dentro de la operación transaccional.

- [ ] **11. Actualizar rutas y esquemas de pedidos**
    RF: RF-6, RF-9
    Hecho cuando: `POST /api/orders` solo acepta ids/cantidades, devuelve el
    pedido con variante y mantiene legibles pedidos históricos sin
    `variantId`.

- [ ] **12. Cubrir backend con tests de rutas y concurrencia**
    RF: RF-1, RF-2, RF-3, RF-5, RF-6, RF-7, RF-9
    Hecho cuando: los tests cubren 400, 409, variante cruzada, duplicados,
    migración, descuento exitoso, agotamiento, snapshot y dos compras
    concurrentes sobre la última unidad.

## Fase 3 — APIs y carrito frontend (depende de 4, 9, 11)

- [ ] **13. Extender `productApi` y `orderApi`**
    RF: RF-3, RF-6
    Hecho cuando: las respuestas se validan con Zod, las peticiones de carrito
    incluyen `variantId` y un `409` se transforma en un resultado con mensaje
    español; los tests con `fetch` simulado pasan.

- [ ] **14. Adaptar `cartLogic` y `CartContext`**
    RF: RF-5, RF-9
    Hecho cuando: agregar, incrementar, decrementar, persistir, restaurar y
    sincronizar conservan variantes separadas y eliminan/ajustan opciones
    inválidas o agotadas sin excepciones.

- [ ] **15. Actualizar `CartDrawer`**
    RF: RF-5, RNF-6, RNF-7
    Hecho cuando: cada línea muestra variante y stock, los controles respetan
    el máximo disponible, los mensajes tienen etiquetas accesibles y la vista
    funciona desde 360 px.

## Fase 4 — Publicación, edición y detalle (depende de 7, 13, 14)

- [ ] **16. Agregar editor de variantes al formulario**
    RF: RF-2, RF-3
    Hecho cuando: publicar y editar permiten agregar, modificar y quitar filas,
    muestran errores por campo en español y envían solo la lista validada.

- [ ] **17. Integrar selector de variante en el detalle**
    RF: RF-4, RF-7
    Hecho cuando: una variante agotada no puede seleccionarse, la selección es
    obligatoria cuando corresponde, el producto totalmente agotado no se puede
    agregar y los controles son accesibles.

- [ ] **18. Integrar variantes en pago y éxito**
    RF: RF-6
    Hecho cuando: el pago envía producto, variante y cantidad, muestra errores
    de stock sin vaciar el carrito y el pedido exitoso muestra la variante
    recibida en su snapshot.

## Fase 5 — Panel administrativo e integración (depende de 8, 12, 15, 16, 17, 18)

- [ ] **19. Mostrar inventario de variantes en administración**
    RF: RF-8
    Hecho cuando: el listado de productos muestra variantes, stock total y
    agotadas, sin introducir un editor de inventario fuera de esta spec.

- [ ] **20. Verificar compatibilidad y regresiones**
    RF: RF-7, RF-8, RF-9
    Hecho cuando: verifico producto legacy, carrito legacy, pedido histórico,
    borrado de producto, reseñas, favoritos e historial, y no hay regresiones en
    las rutas existentes.

- [ ] **21. Cierre: `npm run check` en verde**
    RF: RNF-9, criterios de finalización 1–9
    Hecho cuando: `npm run check` (tipos + tests + build) pasa sin errores y
    anoto el resultado en la respuesta final.
