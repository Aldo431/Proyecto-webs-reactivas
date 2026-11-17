# Tasks 013 — Panel de administración (contenido)

Tareas pequeñas (≈20–40 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde. Un commit local por fase.

## Fase 0 — Base

- [x] **1. Inventario 013**
    RF: RF-1…RF-14
    Hecho cuando: conozco `productService.ts` (`findProducts`, `READ_PROJECTION`, `deleteProduct`, búsqueda sin tildes), `reviewService.ts` y `Review.ts` (`toPublicReview`), `User.ts` (`role`), `adminRoutes.ts`/`adminController.ts` de 012, `errorHandler.ts` (ZodError → 400), `reviewApi.ts` (patrón de API del cliente), `ConfirmDeleteDialog`, `CatalogPagination`, `StarRatingDisplay`, `productImage.ts`, las páginas de `pages/admin/` y los mockups.

## Fase 1 — Esquemas (depende de 1)

- [x] **2. `utils/src/adminSchemas.ts` y sus tests**
    RF: RF-1…RF-9 (RNF-4)
    Hecho cuando: existen `ADMIN_PAGE_SIZE`, los tres esquemas de consulta, los dos de cuerpo, los de respuesta (`adminProductSchema`, `adminUserSchema`, `adminReviewSchema`, `adminActivitySchema`, `adminOverviewSchema`, `adminPageSchema`), se exportan desde `index.ts` y `adminSchemas.test.ts` pasa.

## Fase 2 — Backend: productos (depende de 2)

- [ ] **3. `removeProductAndReferences` y borrado de reseñas**
    RF: RF-5
    Hecho cuando: `deleteProduct` usa la función compartida, que también borra las reseñas; un test nuevo en `productsWriteRoutes.test.ts` comprueba que el dueño borra y las reseñas desaparecen; los tests de 008 siguen pasando.

- [ ] **4. `GET /api/admin/products`**
    RF: RF-2 (RNF-8)
    Hecho cuando: lista con filtros (`q` por nombre o vendedor, `categoria`, `destacados`), paginación con ajuste, `reviewCount`/`averageRating` con una sola agregación, sin leer base64; tests pasan.

- [ ] **5. `PATCH /api/admin/products/:id/featured` y `DELETE /api/admin/products/:id`**
    RF: RF-3, RF-4
    Hecho cuando: destacar responde 200/400/404 y se refleja en `GET /api/products?featured=true`; borrar un producto ajeno responde 204 y limpia referencias y reseñas; tests pasan.

## Fase 3 — Backend: usuarios y reseñas (depende de 2)

- [ ] **6. `GET /api/admin/users` y `PATCH /api/admin/users/:id/role`**
    RF: RF-6, RF-7
    Hecho cuando: el listado busca por nombre, usuario o correo, `rol=user` incluye legados, no expone campos sensibles y trae conteos; cambiar rol responde 200, 403 para el propio, 400 para rol inválido y 404 para id inexistente; tests pasan.

- [ ] **7. `GET /api/admin/reviews` y `DELETE /api/admin/reviews/:id`**
    RF: RF-8, RF-9
    Hecho cuando: filtra `bajas`/`altas`, ordena `recientes`/`menor`, excluye huérfanas, incluye `product { id, name }`; borrar una reseña ajena responde 204 y el promedio público cambia; tests pasan.

## Fase 4 — Backend: resumen (depende de 3–7)

- [ ] **8. `GET /api/admin/overview`**
    RF: RF-1
    Hecho cuando: con `now` inyectable devuelve conteos, categorías con ceros en orden, promedio con 1 decimal o `null`, actividad mezclada (máx. 8) y las tres listas; responde bien con la base vacía; tests pasan.

- [ ] **9. Prueba de acceso para todas las rutas nuevas**
    RF: RF-1…RF-9
    Hecho cuando: una prueba parametrizada comprueba 401 sin sesión y 403 con usuario normal para las 8 rutas, y `npm run check -w backend` está en verde.

## Fase 5 — Frontend: lógica (depende de 2)

- [ ] **10. `logic/adminApi.ts`**
    RF: RF-10…RF-13
    Hecho cuando: las 8 funciones validan respuestas con Zod y devuelven mensajes en español por estado; `adminApi.test.ts` cubre éxito, 401, 403, 404 y respuesta inválida.

- [ ] **11. `logic/adminQuery.ts` y `logic/adminFormat.ts`**
    RF: RF-10…RF-14
    Hecho cuando: lectura/escritura de filtros en la URL (inválidos → default; cambiar filtro borra `pagina`), tiempo relativo, promedio con coma, texto de actividad, barras por categoría y rango "Mostrando X–Y de Z", todo con tests.

- [ ] **12. Hooks `useAdminOverview` y `useAdminList`**
    RF: RF-10, RF-14
    Hecho cuando: exponen `loading | error | ready` y `reload()`, `useAdminList` retrocede de página si la actual queda vacía, y tienen tests.

## Fase 6 — Frontend: secciones (depende de 10–12)

- [ ] **13. Componentes compartidos del panel**
    RF: RF-10…RF-13 (RNF-5, RNF-7)
    Hecho cuando: existen `StatCard`, `CategoryBars`, `ActivityList`, `AdminNotice`, `SegmentedFilter`, `FeaturedSwitch` y la paginación (reutilizada o `AdminPagination`), con los tokens de la spec 00.

- [ ] **14. Sección Resumen**
    RF: RF-10
    Hecho cuando: `AdminOverviewPage` muestra indicadores, barras, actividad, últimas publicaciones y reseñas por revisar como en el mockup, con "Actualizar", carga y error con "Reintentar"; sin desborde en 360 px; su test de página pasa.

- [ ] **15. Sección Productos**
    RF: RF-11, RF-14
    Hecho cuando: filtros en la URL, tabla con desplazamiento propio, switch de destacado con aviso y reversión ante error, eliminar con confirmación y aviso, paginación y vacío; su test de página pasa.

- [ ] **16. Sección Usuarios**
    RF: RF-12, RF-14
    Hecho cuando: filtros en la URL, tabla con insignias de rol, "(tú)" y "Tu cuenta" en la propia fila, diálogo de cambio de rol con los textos de la spec y aviso; su test de página pasa.

- [ ] **17. Sección Reseñas**
    RF: RF-13, RF-14
    Hecho cuando: filtros y orden en la URL, tarjetas con estrellas accesibles y borde ámbar en las bajas, eliminar con confirmación y aviso, paginación y vacío; su test de página pasa.

## Fase 7 — Cierre

- [ ] **18. Prueba manual y check**
    RF: todos
    Hecho cuando: con el seed, dos cuentas (una admin), dos productos publicados por usuarios y reseñas de 1 y 5 estrellas: el Resumen muestra los números correctos; destacar un producto lo hace aparecer en el inicio; borrar un producto ajeno lo quita del catálogo y borra sus reseñas; dar y quitar el rol funciona y no aparece botón en la propia fila; borrar una reseña baja cambia el promedio en el detalle del producto; todo se ve bien en 360 px; `npm run check` en verde.
