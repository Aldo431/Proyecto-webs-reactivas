# Spec 009 — Búsqueda, orden y paginación del catálogo

## Contexto y objetivo

Las specs 003 y 008 dejaron un catálogo que pide todos los productos una sola vez (`GET /api/products`) y filtra por categoría **localmente** en el navegador, con el filtro reflejado en `?categoria=<slug>` de la URL. El backend solo ofrece filtros `categoria`, `featured` e `ids`, un orden fijo (más recientes primero) y devuelve el arreglo completo sin paginar. La búsqueda por texto, los ordenamientos alternativos, el filtro por precio y la paginación quedaron explícitamente fuera de alcance (008, Fuera de alcance).

Esta spec agrega al catálogo **búsqueda por nombre, ordenamientos, filtro por rango de precios y páginas numeradas**, todo ejecutado en el servidor y reflejado en la URL para que la vista sea compartible por enlace y sobreviva a la recarga. El catálogo deja de traer todo de una vez: cada cambio de criterio pide la página correspondiente al backend.

Se redacta como **delta explícito** sobre 003 y 008: cada RF indica si es nuevo o qué RF previo modifica (`modifica 00N/RF-x`). Las specs previas quedan congeladas como línea base.

Lo que **NO** incluye: índice full-text (Atlas Search), búsqueda en descripción, filtro por vendedor, orden por relevancia, scroll infinito, paginación o búsqueda en inicio y "Mis publicaciones", ni multi-selección de categorías.

## Usuarios

- **Comprador**: persona que explora un catálogo creciente y necesita encontrar productos por nombre, acotar por precio, ordenar y avanzar por páginas sin perder su lugar al recargar o compartir el enlace.
- **Comprador móvil**: persona en celular (desde 360 px) que usa el buscador y los filtros con controles táctiles sin romper el layout.
- **Desarrollador /s**: (implícito) quien implementa la feature; requiere esquemas Zod compartidos, query validada, respuesta paginada estable y tests de rutas y de UI.

## Historias de usuario

- Como comprador, quiero buscar productos por su nombre, para encontrar lo que quiero sin recorrer páginas.
- Como comprador, quiero ordenar por precio menor, precio mayor, nombre o recientes, para comparar opciones.
- Como comprador, quiero acotar por precio mínimo y máximo, para ajustarme a mi presupuesto.
- Como comprador, quiero avanzar por páginas numeradas, para navegar un catálogo grande sin esperas.
- Como comprador, quiero que mi búsqueda, orden, filtros y página vivan en la URL, para recargar o compartir el enlace y ver lo mismo.
- Como comprador, quiero saber cuántos productos coinciden y en qué página estoy, para orientarme.
- Como comprador, quiero un estado claro cuando nada coincide, con una forma de limpiar los criterios, para no quedarme atascado.
- Como desarrollador, quiero la query validada con Zod y una respuesta paginada con totales, para no adivinar ni contar en el cliente.

## Requisitos funcionales

**RF-1 — Búsqueda por nombre `?q=`.**
El sistema deberá filtrar productos por coincidencia parcial de texto sobre el nombre. Nuevo.
Criterios de aceptación:
- Cuando se pase `?q=<texto>` no vacío, deberán devolverse solo los productos cuyo `name` contenga el texto como subcadena, insensible a mayúsculas y tildes (p. ej. `q=taza` encuentra "Taza DCC").
- Cuando el texto contenga caracteres especiales de regex (p. ej. `(taza)+`), deberán tratarse como literales y no deberán provocar errores ni coincidencias inesperadas.
- Cuando `q` esté ausente, vacío o con solo espacios, no deberá aplicarse filtro de texto.
- Cuando `q` supere los 100 caracteres, deberá responder `400` en español.

**RF-2 — Ordenamientos `?orden=`.**
El sistema deberá ordenar el listado según el criterio pedido. Nuevo.
Criterios de aceptación:
- Cuando `orden` sea `recientes` o esté ausente, el orden deberá ser el actual (más recientes primero, desempate por `_id` desc).
- Cuando `orden` sea `precio-menor`, los productos deberán ir de menor a mayor precio, con desempate por más recientes.
- Cuando `orden` sea `precio-mayor`, los productos deberán ir de mayor a menor precio, con desempate por más recientes.
- Cuando `orden` sea `nombre`, los productos deberán ir en orden alfabético español insensible a mayúsculas (A–Z).
- Cuando `orden` tenga otro valor, deberá responder `400` en español.

**RF-3 — Filtro por rango de precios `?min=` y `?max=`.**
El sistema deberá acotar el listado a un rango de precios en CLP. Nuevo.
Criterios de aceptación:
- Cuando se pase `min`, deberán devolverse solo productos con `price >= min`; cuando se pase `max`, solo con `price <= max`; ambos deberán combinarse con AND entre sí y con el resto de los filtros.
- Cuando `min` o `max` no sean enteros mayores o iguales a 0, deberá responder `400` en español.
- Cuando `min` sea mayor que `max`, deberá responder `400` en español.

**RF-4 — Páginas numeradas y respuesta con totales.**
El sistema deberá paginar el listado en el servidor con tamaño fijo y devolver los totales. Nuevo; modifica 008/RF-5 (que devuelve el arreglo completo).
Criterios de aceptación:
- Cuando se pase `?pagina=<n>` (entero mayor o igual a 1; ausente equivale a 1), deberá devolverse solo esa página de 9 productos.
- Cuando `pagina` no sea un entero mayor o igual a 1, deberá responder `400` en español.
- Cuando la respuesta sea paginada, deberá tener la forma `{ products, total, pagina, porPagina, totalPaginas }`, donde `total` es el total de coincidencias sin paginar y `totalPaginas` es el techo de `total / porPagina` (0 coincidencias → `totalPaginas: 0`).
- Cuando no se pase `pagina` ni ningún parámetro nuevo (`q`, `orden`, `min`, `max`) y la petición use solo los filtros de 008 (`categoria`, `featured`, `ids`), la respuesta deberá seguir siendo el arreglo simple de 008/RF-5 (compatibilidad con inicio, carrito, favoritos e historial).
- Cuando `pagina` supere `totalPaginas` (con al menos 1 coincidencia), deberá devolverse la última página con resultados en lugar de una página vacía.

**RF-5 — Esquemas compartidos de la consulta en `@tiendadcc/utils`.**
El sistema deberá definir los nuevos parámetros en `utils/` y usarlos en frontend y backend. Nuevo; extiende 008/RF-2.
Criterios de aceptación:
- Cuando se inspeccione `utils/src/productSchemas.ts`, `productListQuerySchema` deberá aceptar además `q` (string `trim`, 1–100), `orden` (enum `["recientes", "precio-menor", "precio-mayor", "nombre"]`, por defecto `"recientes"`), `pagina` (coerción a entero mayor o igual a 1, por defecto 1), `min` y `max` (coerción a entero mayor o igual a 0, opcionales), con mensajes en español.
- Cuando se valide una consulta con `min` mayor que `max`, el esquema deberá rechazarla.
- Cuando el frontend construya la query, deberá usar los tipos inferidos de `@tiendadcc/utils`.

**RF-6 — Buscador y controles en el catálogo.**
El sistema deberá ofrecer en `/catalogo` un buscador por nombre, un selector de orden, campos de precio mínimo y máximo y páginas numeradas. Nuevo; modifica 003/RF-2 y 008/RF-14 (el filtrado deja de ser local).
Criterios de aceptación:
- Cuando cargue el catálogo, deberán mostrarse el campo "Buscar por nombre", el selector "Ordenar por", los campos "Precio mínimo" y "Precio máximo" y los controles de paginación, todos con `label` asociado en español.
- Cuando el usuario escriba en el buscador, la petición deberá enviarse con una espera de 300 ms tras la última tecla (debounce); al limpiar el campo, el filtro de texto deberá eliminarse.
- Cuando el usuario cambie el orden, los precios o la categoría, la página deberá reiniciarse a 1.
- Cuando cambie cualquier criterio, deberá pedirse la página correspondiente al backend (ya no se filtra localmente) con estado de carga accesible; ante error, deberá mostrarse "No se pudieron cargar los productos." con "Reintentar" (sin cambios).
- Cuando no haya coincidencias, deberá mostrarse "No se encontraron productos con esos criterios." con el botón "Limpiar filtros", que restablece todos los criterios y vuelve a la página 1.
- Cuando haya coincidencias, deberá anunciarse "N producto(s) encontrado(s)" en un `role="status"` junto a la paginación ("Página X de Y").

**RF-7 — Parámetros del catálogo en la URL.**
El sistema deberá reflejar todos los criterios en la URL para que la vista sea compartible y sobreviva a la recarga. Nuevo; extiende 003/RF-6 (que solo cubre `categoria`).
Criterios de aceptación:
- Cuando el usuario modifique el buscador, el orden, los precios, la categoría o la página, la URL deberá actualizarse con `replace: true` (sin agregar entradas al historial), usando `q`, `orden`, `pagina`, `min`, `max` y el `categoria` existente.
- Cuando un criterio esté en su valor por defecto (sin texto, orden `recientes`, página 1, sin precios, "Todas"), su parámetro no deberá aparecer en la URL.
- Cuando se acceda por URL o se recargue, deberán aplicarse los parámetros presentes y mostrarse los mismos resultados y controles.
- Cuando un parámetro de la URL sea inválido o desconocido (p. ej. `orden=raro`, `pagina=0`, `min=-5`), deberá ignorarse y usarse el valor por defecto, sin mensajes de error.
- Cuando se use atrás/adelante del navegador, deberá mostrarse la vista correspondiente a la URL sin recarga completa.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final en español, incluidos nombres de órdenes ("Más recientes", "Precio: menor a mayor", "Precio: mayor a menor", "Nombre A–Z"), etiquetas, estados y errores (constitución §6). Identificadores en inglés (`q`, `orden` es el nombre del parámetro en la URL por ser palabra visible; el código usa `order` internamente solo si no cruza la URL).
- **RNF-2 Backend real y separación de capas.** Toda la búsqueda, orden y paginación se ejecutan en MongoDB vía el servicio de productos (constitución §5); el frontend no pagina ni ordena localmente. Lógica en `services/productService.ts` y funciones puras de `src/logic/`; componentes solo presentan (§3).
- **RNF-3 Seguridad y robustez.** El texto `q` se escapa como literal (sin regex inyectable); `pagina`, `min` y `max` validados con Zod con topes (`q` ≤ 100 caracteres); tamaño de página fijo no parametrizable; sin nuevos endpoints ni dependencias.
- **RNF-4 Desempeño.** Cada cambio de criterio hace una sola petición paginada (9 productos); el debounce evita pedir por cada tecla; las tarjetas conservan `loading="lazy"` (008/RNF-4).
- **RNF-5 Sistema de diseño "IDE institucional".** Controles con primitivas (`Input`, `Label`, `Button`, `Badge`/`Select` nativo según 008/RNF-5), `font-mono` en precios y número de página, `font-sans` en etiquetas, errores en `destructive` con texto, foco con `ring`, sin animaciones al filtrar o paginar (00/RF-7).
- **RNF-6 Accesibilidad.** Buscador con `role="searchbox"` y `label`; selector de orden con `label`; paginación como navegación con `aria-label="Paginación"` y `aria-current="page"` en la página activa; total de resultados en `role="status"`; todo operable por teclado; contraste AA.
- **RNF-7 Responsividad.** Desde 360 px sin desplazamiento horizontal: buscador a ancho completo, filtros apilados en una columna y paginación que se envuelve sin recortar botones.
- **RNF-8 Tests.** Lógica y rutas con tests (constitución §4): esquemas de query (límites, `min > max`, valores inválidos); rutas con supertest + `mongodb-memory-server` (búsqueda con mayúsculas/tildes y caracteres especiales, los cuatro órdenes con desempate, rango de precios, páginas y totales, `pagina` más allá del total, combinación AND de todos los filtros, compatibilidad del arreglo simple sin parámetros nuevos); frontend (construcción de la query desde la URL, debounce, reinicio a página 1, `role="status"` con el total, `aria-current`, estado vacío con "Limpiar filtros"). `npm run check` de raíz verifica todo.
- **RNF-9 Sin dependencias nuevas.** Solo React 19, Tailwind v4, Express, Mongoose, Zod y primitivas ya sancionadas (§1, 008/RNF-5).

## Casos límite

- `q` vacío o solo espacios: equivale a sin filtro de texto (cubierto por RF-1).
- `q` con `(.*)` o `+`: se busca literal, sin error (cubierto por RF-1).
- `q` de 101 caracteres: `400` en la API; en la URL se ignora (cubierto por RF-1, RF-7).
- `orden=PRECIO-MENOR` u otro valor: `400` en la API; en la URL se usa `recientes` (cubierto por RF-2, RF-7).
- `min` igual a `max`: solo el precio exacto (cubierto por RF-3).
- `pagina=999` con 2 páginas: se devuelve la página 2 (cubierto por RF-4).
- `pagina=0`, negativa o no numérica: `400` en la API; en la URL se usa 1 (cubierto por RF-4, RF-7).
- Combinación sin resultados (p. ej. texto + precio imposible): estado vacío con "Limpiar filtros" (cubierto por RF-6).
- Cambio de categoría con página 3 activa: vuelve a la página 1 (cubierto por RF-6).
- Atrás del navegador tras filtrar: muestra la vista de la URL sin recarga (cubierto por RF-7).
- Sin conexión: mensaje de error con "Reintentar", sin romper los controles (RNF-4).
- Solo 3 productos con paginación: una sola página, sin controles de paginación visibles salvo el total (cubierto por RF-4, RF-6).

## Fuera de alcance

- Índice full-text (Atlas Search) u orden por relevancia.
- Búsqueda en la descripción.
- Filtro por vendedor.
- Scroll infinito o botón "cargar más".
- Búsqueda, orden o paginación en inicio y "Mis publicaciones".
- Multi-selección de categorías.
- Filtros guardados o historial de búsquedas del usuario.
- Cambios al modelo `Product` o al contrato público (se reutilizan tal cual).

## Criterios de finalización

Esta tarea se considera terminada cuando:

1. `?q=` filtra por subcadena del nombre insensible a mayúsculas y tildes, con especiales tratados como literales (RF-1).
2. Los cuatro órdenes funcionan con sus desempates y el valor inválido responde `400` (RF-2).
3. `min`/`max` acotan en CLP, se combinan con AND y `min > max` responde `400` (RF-3).
4. La respuesta paginada trae `{ products, total, pagina, porPagina, totalPaginas }` de 9 por página, ajusta la página excedida a la última y mantiene el arreglo simple sin parámetros nuevos (RF-4).
5. Los esquemas de la query viven en `@tiendadcc/utils` con mensajes en español (RF-5).
6. El catálogo muestra buscador (debounce 300 ms), selector de orden, precios y páginas numeradas, pide al backend por cambio, reinicia a página 1 y anuncia el total (RF-6).
7. Todos los criterios viven en la URL con `replace: true`, sobreviven a recarga y atrás/adelante, con valores por defecto omitidos e inválidos ignorados (RF-7).
8. El estado vacío ofrece "Limpiar filtros" y el error de red ofrece "Reintentar" (RF-6).
9. Existen los tests de RNF-8 y la UI cumple diseño, accesibilidad y responsividad (RNF-5–RNF-7).
10. `npm run check` pasa sin errores.

## Dudas abiertas

- [RESUELTO] Número de spec: **009** (siguiente libre tras 008); carpeta `specs/009-product-search/`.
- [RESUELTO] Búsqueda solo sobre `name` (no descripción), ejecutada en el servidor para que pagine bien.
- [RESUELTO] Cuatro órdenes: `recientes`, `precio-menor`, `precio-mayor`, `nombre`.
- [RESUELTO] Páginas numeradas en servidor; el filtrado local del catálogo (008/RF-14) se reemplaza por peticiones por cambio.
- [RESUELTO] Filtro extra: rango de precios `min`/`max` en CLP, combinable.
- [RESUELTO] Todos los criterios en la URL (`q`, `orden`, `pagina`, `min`, `max`, `categoria`), con `replace: true` y valores por defecto omitidos.
- [RESUELTO] Alcance solo catálogo; inicio y "Mis publicaciones" sin cambios.
- [RESUELTO — decisión de esta spec, revisar] Tamaño de página fijo en **9** (grilla 3×3 en escritorio); no parametrizable.
- [RESUELTO — decisión de esta spec, revisar] Debounce del buscador en **300 ms**.
- [RESUELTO — decisión de esta spec, revisar] Respuesta paginada como objeto con totales solo cuando se usan parámetros nuevos; sin ellos se mantiene el arreglo simple de 008 para no romper inicio, carrito, favoritos e historial.
- [PENDIENTE — fuera de esta spec] Índice full-text y orden por relevancia cuando el catálogo lo exija.
