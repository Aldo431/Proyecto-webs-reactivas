# Tasks 001 — Página de inicio y accesos de autenticación (frontend)

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario del frontend existente**
    RF: RF-1…RF-8 (base para todo)
    Hecho cuando: conozco la estructura de `apps/frontend/client/`, el punto de montaje de React, la config de TypeScript y el runner de tests (Vitest), y anoté en el plan dónde aterriza cada módulo.

- [x] **2. Arreglar referencia inválida en la spec (RNF-6 → "§7")**
    RF: RNF-6 (consistencia documental)
    Hecho cuando: la spec ya no cita una sección inexistente de la constitución y el cambio queda registrado.

## Fase 1 — Lógica pura y datos (depende de 1)

- [x] **3. Implementar `routeParser` (decodificación hash → ruta)**
    RF: RF-1, RF-2, RF-3, RF-8
    Hecho cuando: decodifica `#/`, `#/registro`, `#/iniciar-sesion`, hash vacío, desconocido y malformado; devuelve `home`/`register`/`login`/`unknown` y sus tests unitarios pasan.

- [x] **4. Implementar `productParse` + esquema Zod del producto**
    RF: RF-6
    Hecho cuando: valida la estructura de un producto (id, name, category, image, description) y rechaza entradas malformadas; sus tests pasan.

- [x] **5. Crear `products.json` (catálogo de ejemplo)**
    RF: RF-6
    Hecho cuando: contiene al menos taza, polera y sticker con rutas de imagen locales, y pasa la validación de `productParse`.

## Fase 2 — Infraestructura de UI (depende de 3)

- [x] **6. Implementar hook `useHashRouter` + `navigate`**
    RF: RF-2, RF-3, RF-7, RF-8
    Hecho cuando: el cambio de hash actualiza la ruta activa sin recargar el sitio, y una URL directa/recarga en cualquier vista renderiza la página correcta.

- [x] **7. Implementar componente `TextField` reutilizable**
    RF: RF-4, RF-5
    Hecho cuando: renderiza un campo con etiqueta clara y estado local de UI, operativo por teclado (RNF-4).

- [x] **8. Implementar `Header` (logo clicable + botón "Volver")**
    RF: RF-7
    Hecho cuando: el logo en cualquier página y "Volver" en los formularios llevan al inicio; en el inicio el logo no provoca recarga.

## Fase 3 — Página de inicio (depende de 4, 6)

- [x] **9. Implementar `ProductCard` y `ProductGrid`**
    RF: RF-6
    Hecho cuando: la grilla renderiza con 1 y con N productos sin romperse, cada tarjeta muestra nombre e imagen, y el clic no navega (asumido sin efecto).

- [x] **10. Implementar `AuthBar` (accesos "Registrarse ahora" / "Iniciar sesión")**
    RF: RF-1, RF-2, RF-3
    Hecho cuando: ambos accesos se muestran y navegan a su vista respectiva sin recargar; clics repetidos no encolan acciones.

- [x] **11. Implementar `HomePage` (logo, descripción, accesos, grilla)**
    RF: RF-1, RF-6
    Hecho cuando: el inicio muestra "TiendaDCC" como elemento principal, una breve descripción de la tienda y la sección de productos de ejemplo.

## Fase 4 — Páginas de formulario (depende de 7)

- [x] **12. Implementar `RegisterPage` (4 campos, envío sin efecto)**
    RF: RF-4
    Hecho cuando: muestra nombre, correo, contraseña y confirmación; el envío (con campos vacíos o absurdos) no valida ni envía y no desencadena error.

- [x] **13. Implementar `LoginPage` (2 campos, envío sin efecto)**
    RF: RF-5
    Hecho cuando: muestra correo y contraseña; el envío (con campos vacíos o absurdos) no valida ni envía y no desencadena error.

## Fase 5 — Integración y cierre (depende de 12, 13)

- [x] **14. Montar router + páginas en el punto de entrada**
    RF: RF-1…RF-8
    Hecho cuando: las tres vistas se renderizan según el hash, con transición inmediata y sin llamadas de red (RNF-2, RNF-5).

- [x] **15. Verificar accesibilidad y responsividad**
    RF: RNF-3, RNF-4
    Hecho cuando: todos los accesos y campos son alcanzables por teclado con etiquetas claras, y la grilla se reordena en escritorio/móvil sin romperse.

- [x] **16. Verificación QA según criterios de finalización**
    RF: RF-1…RF-8 (contrato)
    Hecho cuando: pruebo clic a formularios y regreso (Volver/logo), URL directa y recarga en las tres vistas, y envío sin acción; sin errores en consola ni en red.

- [x] **17. Cierre: `npm run check` en verde**
    RF: RNF-7, criterio de finalización 7
    Hecho cuando: `npm run check` (tipos + tests + build) pasa sin errores y anoto el resultado en la respuesta final.