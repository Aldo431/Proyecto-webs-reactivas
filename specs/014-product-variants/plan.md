# Plan 014 — Variantes de producto

Plan de implementación para la spec `014-product-variants`. Respeta la
constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-9. Cada sección indica qué
RF atiende.

## 1. Estructura de módulos

*Cubre: RF-1 a RF-9.*

### Utilidades y contratos compartidos

- **`utils/src/productSchemas.ts`**: agregar `productVariantSchema`,
  `productVariantsSchema`, los campos de variantes a los esquemas públicos y
  de creación/edición, con `MAX_VARIANT_STOCK = 1000`, nombres normalizados y
  validación de ids/nombres duplicados *(RF-1, RF-2, RF-3)*.
- **`utils/src/orderSchemas.ts`**: agregar `variantId`, `variantName` y los
  límites correspondientes a entradas y líneas de pedido; mantener opcionales
  los campos de variante en pedidos históricos *(RF-6, RF-9)*.
- **`utils/src/profileSchemas.ts`** y los tipos de carrito compartidos:
  extender cada línea con `variantId` y conservar `productId` y `quantity`
  *(RF-5, RF-9)*.
- **`utils/src/variantLogic.ts`**: funciones puras para identificar líneas,
  normalizar variantes base, limitar cantidades al stock y calcular stock
  total *(RF-1, RF-5, RF-7, RF-9)*. Reexportar desde `utils/src/index.ts`.

### Backend

- **`apps/backend/src/models/Product.ts`**: añadir subdocumentos embebidos
  `variants` con `_id`, `name` y `stock`; mantener precio, imagen y vendedor
  en el producto *(RF-1)*.
- **`apps/backend/src/services/productService.ts`**: validar y normalizar
  variantes al crear/editar, serializar el contrato público, migrar productos
  antiguos a la variante base con stock inicial 1000 y conservar la limpieza
  de referencias al borrar
  productos *(RF-2, RF-3, RF-7, RF-9)*.
- **`apps/backend/src/services/orderService.ts`**: resolver pares
  `productId`/`variantId`, comprobar disponibilidad, descontar stock dentro de
  una transacción Mongoose y crear el snapshot del pedido *(RF-5, RF-6)*.
- **`apps/backend/src/controllers/productsController.ts`** y
  **`ordersController.ts`**: pasar los cuerpos por Zod y traducir agotamiento a
  `409`, conservando el orden existente de autenticación, existencia y
  validación *(RF-3, RF-6)*.
- **`apps/backend/src/routes/productsRoutes.ts`** y
  **`ordersRoutes.ts`**: conservar las rutas existentes, ampliando sus
  contratos sin agregar endpoints de inventario fuera de alcance *(RF-2,
  RF-6)*.
- **`apps/backend/src/seed/seedProducts.ts`**: crear o completar la variante
  base de productos heredados sin duplicarla y sin alterar pedidos *(RF-9)*.
- **`apps/backend/src/services/adminService.ts`** y esquemas administrativos:
  incluir variantes, stock total y conteo de agotadas en la salida del panel
  *(RF-8)*.

### Frontend: lógica

- **`apps/frontend/client/src/logic/cartLogic.ts`**: cambiar la clave de
  identidad de una línea a `productId + variantId`, validar stock al agregar e
  hidratar líneas contra la respuesta pública del producto *(RF-5, RF-9)*.
- **`apps/frontend/client/src/logic/productApi.ts`** y
  **`orderApi.ts`**: validar respuestas ampliadas, enviar `variantId` y mapear
  `409` a un resultado visible en español *(RF-3, RF-6)*.
- **`apps/frontend/client/src/logic/variantLogic.ts`**: formatear nombres,
  disponibilidad y cantidades para la UI sin acceder al DOM *(RF-4, RF-5,
  RF-7)*.

### Frontend: presentación

- **Formulario de publicación/edición**: editor mínimo de filas de variante
  con nombre, stock, agregar y quitar *(RF-2)*.
- **`ProductDetailPage.tsx`**: selector accesible de variante, estados
  agotado y selección obligatoria *(RF-4, RF-7)*.
- **`CartDrawer.tsx`** y `CartContext.tsx`: mostrar variante, disponibilidad,
  límites de cantidad y líneas separadas *(RF-5)*.
- **`PaymentPage.tsx`** y `PaymentSuccess.tsx`: enviar la variante elegida y
  mostrarla en el resumen/snapshot recibido *(RF-6)*.
- **Sección Productos del panel admin**: mostrar variantes y existencias sin
  crear un editor de inventario adicional *(RF-8)*.

## 2. Modelo de datos JSON

*Cubre: RF-1, RF-3, RF-5, RF-6 y RF-9.*

Producto público:

```json
{
  "id": "665000000000000000000001",
  "name": "Polera DCC",
  "price": 12000,
  "image": "/api/products/665000000000000000000001/image?v=1",
  "variants": [
    { "id": "665000000000000000000011", "name": "Negra / M", "stock": 8 },
    { "id": "665000000000000000000012", "name": "Negra / L", "stock": 0 }
  ]
}
```

Línea de carrito:

```json
{
  "productId": "665000000000000000000001",
  "variantId": "665000000000000000000011",
  "quantity": 2
}
```

Entrada de pedido:

```json
{
  "items": [
    {
      "productId": "665000000000000000000001",
      "variantId": "665000000000000000000011",
      "quantity": 2
    }
  ]
}
```

Snapshot de pedido:

```json
{
  "productId": "665000000000000000000001",
  "variantId": "665000000000000000000011",
  "variantName": "Negra / M",
  "name": "Polera DCC",
  "image": "/images/polera-dcc.png",
  "unitPrice": 12000,
  "quantity": 2,
  "subtotal": 24000
}
```

`variants` será un arreglo embebido en `Product`; los ids públicos se
serializarán como strings y el precio/imagen no se duplicará por variante.
Los pedidos antiguos podrán omitir `variantId` y `variantName` para conservar
compatibilidad *(RF-9)*.

## 3. Decisiones técnicas justificadas

*Cubre: transversal, RF-1 a RF-9.*

**D1 — Variantes embebidas en `Product`.**
- Justificación: una variante no tiene ciclo de vida independiente del producto
  y debe viajar junto a él para el detalle y el catálogo *(RF-1, RF-3, RNF-8)*.
- Alternativa descartada: **colección `ProductVariant` separada**. Añadiría
  joins/populates y consultas N+1 sin beneficio solicitado *(RNF-8,
  constitución §5)*.

**D2 — Nombre libre por combinación.**
- Justificación: `{ id, name, stock }` representa tanto una opción simple como
  una combinación (`"Rojo / M"`) sin inventar un catálogo de atributos no
  requerido *(RF-1, RF-2)*.
- Alternativa descartada: **campos `size`, `color`, `material`**. Fijaría
  atributos que el usuario no solicitó y complicaría combinaciones futuras
  *(Fuera de alcance)*.

**D3 — Variante base automática para legado.**
- Justificación: los productos existentes deben seguir siendo comprables; la
  migración crea una variante estable `Base` con stock inicial 1000 *(RF-7,
  RF-9)*.
- Alternativa descartada: **bloquear productos sin variantes**. Rompería
  productos y carritos existentes, contrario a RF-9.

**D4 — Stock máximo de 1000 y stock cero visible.**
- Justificación: el límite acota entradas accidentales y `0` permite informar
  agotamiento sin borrar la opción *(RF-1, RF-4, RF-7)*.
- Alternativa descartada: **stock ilimitado o `null`**. Impediría garantizar
  límites en carrito y descuento atómico *(RF-5, RF-6)*.

**D5 — Descuento condicional dentro de transacción.**
- Justificación: cada actualización usa la condición `stock >= quantity` y la
  creación del pedido ocurre en la misma sesión/transacción, evitando stock
  negativo y pedidos sin inventario *(RF-6, RNF-5)*.
- Alternativa descartada: **leer stock y actualizar después**. Tiene una
  carrera entre compradores y puede vender la última unidad dos veces.

**D6 — Stock público en el contrato.**
- Justificación: el cliente debe deshabilitar opciones agotadas y limitar el
  contador sin una petición por variante *(RF-3, RF-4, RF-7, RNF-8)*.
- Alternativa descartada: **ocultar stock y validar solo al pagar**. Produciría
  una UX engañosa y no permitiría limitar el carrito localmente.

**D7 — Compatibilidad opcional de pedidos históricos.**
- Justificación: los pedidos son snapshots inmutables y no deben reescribirse
  para introducir una variante inventada *(RF-6, RF-9)*.
- Alternativa descartada: **migrar retrospectivamente cada pedido**. No existe
  información confiable para determinar la variante comprada.

## 4. Estrategia de tests

*Cubre: RF-1 a RF-9 y RNF-9.*

### Lógica pura obligatoria

- Esquemas de variante: aceptar stock `0` y `1000`; rechazar `-1`, `1001`,
  decimales, nombres vacíos y duplicados *(Verifica RF-1, RF-3)*.
- Normalización: transformar producto legacy en una variante base; no duplicar
  base en ejecuciones repetidas *(Verifica RF-7, RF-9)*.
- Identidad de carrito: fusionar misma pareja y separar variantes distintas;
  truncar o eliminar líneas sin stock *(Verifica RF-5)*.
- Cálculo de stock total y agotadas *(Verifica RF-7, RF-8)*.
- Contratos de pedido: exigir `variantId` en entradas nuevas y aceptar líneas
  históricas sin él *(Verifica RF-6, RF-9)*.

### Backend

- Tests Mongoose del modelo y rutas de publicación/edición: variantes válidas,
  duplicadas, stock fuera de rango y mass assignment *(RF-1, RF-2, RF-3)*.
- Tests de carrito/sincronización: líneas por variante, stock reducido,
  variante eliminada y producto legacy *(RF-5, RF-9)*.
- Tests de pedidos con `mongodb-memory-server`: variante inexistente,
  producto-variante cruzado, agotamiento `409`, descuento exitoso, snapshot y
  aislamiento por usuario *(RF-6)*.
- Test de concurrencia simulada sobre la última unidad: una operación triunfa
  y otra falla sin stock negativo *(RF-6, RNF-5)*.
- Tests del panel admin: variantes, stock total y agotadas *(RF-8)*.

### Frontend y QA manual

- Tests de `productApi`, `orderApi`, selector y lógica de carrito con `fetch`
  simulado *(RF-3, RF-5, RF-6)*.
- Smoke opcional del formulario, detalle, drawer y pago; la presentación pura
  no exige cobertura adicional según §4.
- Verificación manual desde 360 px: seleccionar variante, agregar dos
  variantes del mismo producto, alcanzar stock, recargar, pagar y revisar el
  snapshot *(RF-4 a RF-7)*.
- Verificación manual de producto legacy migrado y pedido histórico *(RF-9)*.
- Comando de cierre: `npm run check` debe pasar antes de terminar.

## 5. Cobertura de RFs

| Parte del plan | RF |
|---|---|
| Esquemas y modelo Mongoose de variantes | RF-1, RF-3 |
| Publicación, edición, seed y migración base | RF-2, RF-9 |
| Selector de detalle y contrato público | RF-3, RF-4, RF-7 |
| Lógica y persistencia del carrito | RF-5, RF-9 |
| Servicio transaccional y snapshot de pedidos | RF-6 |
| Panel administrativo | RF-8 |
| Tests de lógica pura, backend y frontend | Verificación RF-1 a RF-9 (§4) |

---

Nota: las decisiones abiertas de la spec quedaron resueltas: se crea una
variante base para productos existentes, con stock inicial 1000, y el stock
máximo por variante también es 1000.
