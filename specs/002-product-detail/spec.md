# Spec 002 — Página individual de producto (detalle por clic en ProductCard)

## Contexto y objetivo
La spec 001 dejó una tienda **solo frontend** con grilla de productos de ejemplo donde el clic en una tarjeta no navega a ninguna vista (`spec 001`, RF-6, criterio 3) y el detalle de producto quedó explícitamente fuera de alcance. Esta spec agrega la **página individual de producto**: al activar una `ProductCard` el sistema navega a una vista de detalle con la información del producto. Sigue sin haber backend, API ni persistencia: se reutilizan el catálogo estático `products.json`, la validación Zod y el hash routing de 001. El tercer criterio de aceptación del RF-6 de 001 ("el clic no deberá navegar") queda **reemplazado** por esta spec a partir de su aprobación. El ruteo por hash se implementa como tabla modular de parsers por ruta (tipo `RouteParser`), de modo que futuras vistas (carrito, catálogo, filtros) se añadan como nuevas entradas con sus propias specs, sin modificar `parseRoute`.

## Usuarios
- **Visitante / comprador potencial**: persona que explora la grilla, abre el detalle de un producto para conocerlo mejor y vuelve al inicio para seguir explorando.
- **Desarrollador /s**: (implícito) quien consume la spec para implementar; requiere criterios verificables.

## Historias de usuario
- Como visitante, quiero hacer clic en un producto de la grilla para ver su página de detalle, para conocerlo mejor.
- Como visitante, quiero ver la imagen, el nombre, la categoría y la descripción del producto en su página, para decidir si me interesa.
- Como visitante, quiero poder volver al inicio desde la página de detalle, para seguir explorando sin perderme.
- Como visitante, quiero poder recargar o compartir la URL de un producto y ver el mismo detalle, para retomarlo después.

## Requisitos funcionales

**RF-1 — Navegación desde la tarjeta al detalle.**
Cuando el usuario active una tarjeta de producto en la página de inicio, el sistema deberá navegar a la página de detalle de ese producto.
Criterios de aceptación:
- Cuando el usuario active una tarjeta (clic o teclado Enter/Espacio sobre su enlace), deberá presentarse la página de detalle del producto correspondiente sin recargar el sitio.
- Cuando una tarjeta se muestre, deberá exponer un enlace con destino a la ruta de detalle de ese producto, operable mediante teclado.
- Cuando el usuario active una tarjeta, no deberá abrirse el detalle de otro producto ni ninguna otra vista.

**RF-2 — Contenido de la página de detalle.**
Mientras el usuario esté en la página de detalle de un producto existente, el sistema deberá mostrar su imagen, nombre, categoría y descripción, además de los accesos de regreso.
Criterios de aceptación:
- Cuando el detalle se cargue con un id existente, deberá mostrarse la imagen del producto con texto alternativo igual a su nombre.
- Cuando el detalle se cargue con un id existente, deberá mostrarse el nombre del producto como encabezado principal.
- Cuando el detalle se cargue con un id existente, deberán mostrarse su categoría y su descripción.
- Cuando el detalle se cargue con un id existente, deberán mostrarse el logo "TiendaDCC" y un control "Volver".

**RF-3 — Producto inexistente.**
Cuando el usuario acceda al detalle con un id que no existe en el catálogo, el sistema deberá mostrar un estado de no encontrado en español con vía de regreso, sin pantalla vacía ni datos ajenos.
Criterios de aceptación:
- Cuando el id no exista en el catálogo, deberá mostrarse el mensaje "Producto no encontrado".
- Cuando el id no exista en el catálogo, deberá ofrecerse un control "Volver" que lleve a la página de inicio.
- Cuando el id no exista en el catálogo, no deberá mostrarse la información de ningún otro producto.

**RF-4 — Regreso al inicio desde el detalle.**
Cuando el usuario esté en la página de detalle (o en el estado de no encontrado), el sistema deberá ofrecer el regreso al inicio mediante el botón "Volver" y mediante el logo "TiendaDCC".
Criterios de aceptación:
- Cuando el usuario active "Volver" desde el detalle, deberá presentarse la página de inicio.
- Cuando el usuario active el logo "TiendaDCC" desde el detalle, deberá presentarse la página de inicio.

**RF-5 — Acceso directo por URL y recarga.**
Cuando el usuario acceda directamente por URL a un detalle o recargue la página, el sistema deberá mostrar el detalle o estado correspondiente sin errores.
Criterios de aceptación:
- Cuando el usuario acceda por URL a `#/producto/<id>` con un id existente, deberá mostrarse el detalle de ese producto.
- Cuando el usuario acceda por URL a `#/producto/<id>` con un id inexistente, deberá mostrarse el estado de no encontrado (RF-3).
- Cuando el usuario recargue (F5) la página de detalle, deberá mantenerse en el mismo detalle o estado.
- Cuando el usuario use atrás/adelante del navegador entre inicio y detalle, deberá mostrarse la vista correspondiente sin recarga completa del sitio.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final deberá estar en español (constitución, §6).
- **RNF-2 Sin backend ni persistencia.** El sistema no deberá realizar llamadas de red, no deberá consultar ni persistir datos, y no deberá requerir backend para su funcionamiento (igual que 001).
- **RNF-3 Responsividad.** Cuando el detalle se visualice en móvil deberá apilarse en una columna y en escritorio podrá usar dos columnas (imagen + información), sin romper el contenido.
- **RNF-4 Accesibilidad.** Cada tarjeta deberá ser un enlace focable con nombre accesible igual al nombre del producto; la imagen del detalle deberá llevar texto alternativo; los encabezados deberán mantener jerarquía; todo deberá ser operable mediante teclado.
- **RNF-5 Desempeño.** Cuando el usuario navegue entre inicio y detalle, la transición deberá ser inmediata, sin recarga completa del sitio.
- **RNF-6 Sin dependencias nuevas.** No se deben agregar dependencias fuera del stack definido (constitución, §1). Se mantienen las dependencias de desarrollo de tests ya sancionadas en 001 (Vitest, jsdom y @testing-library/react).
- **RNF-7 Tests.** Toda lógica de negocio nueva (ruteo extendido, búsqueda por id) deberá tener tests; `npm run check` deberá pasar antes de dar por terminada la tarea (constitución, §4).

## Casos límite
- Ruta `#/producto/` vacía o `#/producto` sin id: se trata como ruta desconocida (`unknown`, sin detalle) y no deberá mostrar ni detalle ni no-encontrado de producto (cubierto por RF-5).
- Ruta `#/producto/<id>/<extra>` o con segmentos adicionales: se trata como desconocida (cubierto por RF-5).
- Id con mayúsculas, espacios o caracteres codificados: la comparación es exacta y sensible a mayúsculas contra los ids del catálogo (kebab-case); un id que no calce exactamente cae en no-encontrado (RF-3). El id se decodifica una vez (`decodeURIComponent`) antes de comparar.
- Imagen local faltante o rota: el layout no deberá romperse y deberá conservarse el texto alternativo; no se usa placeholder externo (RNF-2).
- Pulsaciones repetidas sobre la misma tarjeta: navegan a la misma vista sin duplicar o encolar acciones (hereda `navigate` de 001).
- Catálogo con exactamente un producto o con varios: el detalle debe funcionar igual en ambos casos.
- Botón atrás del navegador desde el detalle: vuelve a la vista anterior sin recarga (RF-5).
- Sin conexión a internet: el funcionamiento debe ser idéntico, por ser contenido estático (RNF-2).

## Fuera de alcance
- Precio, stock, variantes (tallas/colores), selector de cantidad, carrito, checkout y pagos.
- Backend, API, base de datos (MongoDB/Mongoose) y catálogo dinámico.
- Búsqueda, filtros, orden y productos relacionados.
- Autenticación real, sesiones y validación de formularios (sigue vigente 001).
- SEO/SSR, metadatos dinámicos y analítica.
- Cambios al formato del JSON de productos (se reutiliza el modelo de 001).
- Lógica de carrito, catálogo y filtros: el ruteo solo deja el mecanismo de extensión (tabla de `RouteParser`); no existen parsers, páginas ni URLs reservadas para esas rutas hasta que sus specs las definan.
- Despliegue y entorno de producción.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. Activar (clic o teclado) cada tarjeta de la grilla lleva a su página de detalle sin recargar el sitio (RF-1).
2. El detalle de un producto existente muestra su imagen (con texto alternativo), nombre, categoría y descripción, más el logo y "Volver" (RF-2).
3. Un id inexistente muestra "Producto no encontrado" con "Volver" al inicio y sin datos de otro producto (RF-3).
4. "Volver" y el logo llevan al inicio desde el detalle y desde el no-encontrado (RF-4).
5. El acceso directo por URL y la recarga (F5) funcionan para ids existentes e inexistentes, y atrás/adelante no recarga el sitio (RF-5).
6. El detalle se adapta a móvil y escritorio y es totalmente operable por teclado (RNF-3, RNF-4).
7. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Ruta del detalle: `#/producto/:id` con el hash routing existente (coherente con RF-8 de 001); p. ej. `#/producto/taza-dcc`.
- [RESUELTO] Tarjeta como enlace `<a>` nativo (no `div` con `onClick`): accesible por teclado, permite copiar enlace y clic medio.
- [RESUELTO] Nomenclatura del ruteo modular: se reusa el vocabulario existente (`parseRoute` pública + `parseXRoute` por ruta + tabla `routeParsers` + tipo `RouteParser`); no se introduce `match`/`matcher` por ser jerga nueva que confunde con regex/booleanos.
- [RESUELTO] Carrito, catálogo y filtros se consideran en el diseño (cada uno será una entrada de la tabla con su propia spec), pero sin lógica ni URLs en esta fase; cuando se implementen, esos apartados de la spec y del plan cambiarán.
- [RESUELTO] Campos del detalle = los 5 actuales (`id`, `name`, `category`, `image`, `description`); sin precio ni stock en esta fase porque exigirían cambiar el formato del JSON.
- [RESUELTO] Sin "Añadir al carrito" ni "productos relacionados" en esta fase; pertenecen a futuras specs de carrito y catálogo.
- [ACLARADO] Texto exacto del no-encontrado: "Producto no encontrado" y etiqueta del regreso del detalle ("Volver al inicio" si proviene del inicio (por ahora, sí), o "Volver a productos" en caso de venir desde productos (en un futuro)).
