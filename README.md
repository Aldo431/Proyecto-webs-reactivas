# tiendaDCC

Página web de venta de productos del Departamento de Ciencias de la Computación (DCC) de la Universidad de Chile (tazas, poleras, stickers, pins, etc.).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + React Router + Zustand + Tailwind v4 (componentes shadcn/Radix) |
| Backend | Express + Mongoose (MongoDB) |
| Base de datos | MongoDB (modelos `User` y `Product`) |
| Validación | Zod (esquemas compartidos en `utils/`) |
| Estado global | Zustand: `stores/authStore.ts` (sesión) y `stores/cartStore.ts` (carrito) |
| Tests | Vitest + Testing Library + supertest; E2E con Playwright (`e2etests/`) |
| Calidad | TypeScript estricto + ESLint (`typescript-eslint`, reglas de hooks de React) |

La constitución del proyecto vive en `docs/constitution.md`; define las reglas de stack, orden de trabajo, separación de lógica/UI, política de tests, persistencia e idioma.

## Estructura del repositorio

```
apps/frontend/client/   Aplicación React (componentes, páginas, hooks, lógica)
apps/backend/           Backend Express (rutas, controladores, servicios, modelos)
utils/                  Esquemas Zod y tipos compartidos (@tiendadcc/utils)
e2etests/               Tests end-to-end con Playwright (proyecto npm independiente)
docs/                   Constitución del proyecto
specs/<id>/             Spec, plan y tareas por funcionalidad
```

## Flujo de trabajo del proyecto

Todo cambio de comportamiento sigue este orden (constitución):

1. **Spec** (`specs/<id>/spec.md`): el QUÉ y el POR QUÉ — requisitos funcionales (RF-x) con criterios de aceptación en EARS, requisitos no funcionales, casos límite, fuera de alcance y dudas abiertas.
2. **Plan** (`specs/<id>/plan.md`): estructura de módulos, modelo de datos, decisiones técnicas con alternativas descartadas, estrategia de tests y cobertura de RF.
3. **Tareas** (`specs/<id>/tasks.md`): tareas pequeñas en orden de dependencia, cada una con sus RF y criterio "Hecho cuando:".
4. **Código**: tests primero, luego implementación.
5. **Cierre**: `npm run check` en verde antes de dar por terminada una tarea.

Reglas clave: no se escribe código sin spec previa, no se agregan dependencias fuera del stack sin actualizar la spec, la lógica de negocio vive separada de la interfaz y toda lógica de negocio debe tener tests.

## Requisitos

- Node.js ≥ 20 y npm ≥ 10.

## Instalación

El repositorio usa workspaces npm (`apps/frontend/client`, `apps/backend`, `utils`). Instala desde la raíz:

```bash
npm install
```

## MongoDB con Docker

El estándar del equipo es MongoDB 7 en Docker como **replica set de un nodo**: los pedidos usan transacciones (spec 012/014) y un MongoDB standalone las rechaza, así que sin replica set fallaría el pago. La primera vez:

```bash
docker run -d --name tiendadcc-mongo -p 127.0.0.1:27017:27017 \
  -v tiendadcc-mongo-data:/data/db mongo:7 --replSet rs0
sleep 5
docker exec tiendadcc-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
docker exec tiendadcc-mongo mongosh --quiet --eval 'rs.status().members[0].stateStr'   # → PRIMARY
```

Luego, cada día: `docker start tiendadcc-mongo` antes de trabajar y `docker stop tiendadcc-mongo` al terminar (datos y replica set quedan en el volumen `tiendadcc-mongo-data`). El puerto se publica solo en `127.0.0.1` porque la base no tiene contraseña.

- `docker port tiendadcc-mongo` debe mostrar `27017/tcp -> 127.0.0.1:27017`. Si no muestra nada (el contenedor se creó cuando el puerto estaba ocupado), recréalo con `docker rm -f tiendadcc-mongo` y el `docker run` de arriba; el volumen conserva los datos.
- `address already in use`: otro proceso usa el 27017 (`sudo ss -ltnp 'sport = :27017'` muestra cuál); ciérralo antes de crear el contenedor.
- `Server selection timed out` en el seed o la API: el contenedor no está corriendo, el replica set no está inicializado o `MONGODB_URI` no apunta a `127.0.0.1:27017/...?replicaSet=rs0`.

Los tests E2E no usan este contenedor: levantan su propia base en memoria.

## Variables de entorno

El backend valida sus variables con Zod al arrancar (`apps/backend/src/config/env.ts`); si falta `MONGODB_URI` o `JWT_SECRET`, aborta con un mensaje en español y no escucha peticiones. Copia las plantillas y completa los valores:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/client/.env.example apps/frontend/client/.env.local
```

Los archivos `.env` y `.env.local` están gitignoreados; las plantillas `.env.example` sí se versionan.

### Backend — `apps/backend/.env`

Lo carga `npm run dev -w backend` con `--env-file-if-exists=.env` (cwd = `apps/backend`). Un `.env` en la raíz **no** se lee.

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `MONGODB_URI` | Sí | — | Cadena de conexión de MongoDB. Con el contenedor de [MongoDB con Docker](#mongodb-con-docker): `mongodb://127.0.0.1:27017/tiendadcc?replicaSet=rs0`. |
| `JWT_SECRET` | Sí | — | Secreto para firmar los JWT (expiran en 7 días). Genera con `openssl rand -hex 32`. |
| `PORT` | No | `3001` | Puerto del backend. Si lo cambias, actualiza el target del proxy en `apps/frontend/client/vite.config.ts`. |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test`. En `production` la cookie se marca `Secure` (requiere HTTPS). |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Origen exacto del frontend para CORS con credenciales. |
| `SEED_SELLER_PASSWORD` | Solo para el seed | — | Contraseña (8–100 caracteres) del vendedor de prueba `vendedor@tiendadcc.cl`. La lee únicamente `npm run seed -w backend`; la API no la usa. |

### Frontend — `apps/frontend/client/.env.local`

Vite solo expone las variables con prefijo `VITE_`.

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `VITE_API_URL` | No | vacío (`""`) | URL base del backend. Vacío = mismo origen (Vite proxya `/api` a `http://localhost:3001`); recomendado en desarrollo. Al apuntar a otro origen, la cookie `SameSite=Lax` no se envía y la sesión no se mantiene. |

Los tests no necesitan `.env`: `apps/backend/vitest.config.ts` inyecta sus propias variables.

## Comandos (desde la raíz)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta Vite en `http://localhost:5173` con hot reload |
| `npm run dev -w backend` | Levanta la API en `http://localhost:3001` (requiere `apps/backend/.env` y MongoDB) |
| `npm run seed -w backend` | Carga en MongoDB los productos de `apps/backend/src/seed/products.json` con el vendedor de prueba (requiere `apps/backend/.env`, ver [Seed de productos](#seed-de-productos-spec-008)) |
| `npm run make-admin -w backend -- <correo>` | Convierte una cuenta existente en administradora (requiere `apps/backend/.env`, ver [Crear un administrador](#crear-un-administrador-spec-012)) |
| `npm run lint` | Ejecuta ESLint en todo el repositorio (`npm run lint:fix` corrige lo automático) |
| `npm run check` | Ejecuta ESLint, verifica tipos (`tsc --noEmit`) y corre los tests (Vitest) de `utils`, backend y frontend |
| `npm run build` | Compila la app a `apps/frontend/client/dist` |
| `npm run e2e:install` | Instala `e2etests/` y el navegador Chromium de Playwright (una vez) |
| `npm run e2e` | Ejecuta los tests E2E (levanta backend en modo test con MongoDB en memoria y Vite) |

## Cómo correr el proyecto

Desde la raíz del repositorio (en `apps/backend`, `npm run dev` levanta el backend, no el frontend):

```bash
docker start tiendadcc-mongo  # MongoDB (ver "MongoDB con Docker")
npm run dev -w backend        # API en http://localhost:3001
npm run dev                   # frontend en http://localhost:5173 (otra terminal)
```

### Seed de productos (spec 008)

Carga el catálogo inicial (`apps/backend/src/seed/products.json`: 3 originales más Pin cadcc, Polera sushi cats, Polera meme, Pin dcc, Taza dcc y Taza cadcc) en MongoDB, con sus imágenes `/images/...` y a nombre del vendedor de prueba `tiendadcc` (`vendedor@tiendadcc.cl`).

```bash
# 1. En apps/backend/.env define MONGODB_URI y SEED_SELLER_PASSWORD (≥ 8 caracteres)
# 2. Con MongoDB en marcha:
npm run seed -w backend
```

- Valida el entorno antes de conectar: si falta `SEED_SELLER_PASSWORD` (o `MONGODB_URI`) termina con un mensaje en español y no escribe nada.
- Es **idempotente**: crea el vendedor solo si no existe (no cambia su contraseña si ya existe) y actualiza los productos por vendedor + nombre, sin duplicarlos.
- Reemplaza los ids antiguos (`taza-dcc`, `polera-dcc`, `sticker-dcc`) por los `_id` nuevos en los favoritos, el historial y el carrito de las cuentas existentes; las demás referencias no se tocan.
- Crea los productos del último al primero, de modo que el listado público (del más reciente al más antiguo) conserve el orden del JSON. En una base ya sembrada con una versión anterior el orden no cambia al re-ejecutar; para reordenar hay que borrar esos productos y volver a correr el seed.
- Escribe en la base indicada por `MONGODB_URI`: revisa que apunte a desarrollo antes de ejecutarlo.

### Crear un administrador (spec 012)

Las cuentas nuevas siempre se registran con rol `user`; el rol no se puede fijar desde la API pública. Para probar el panel de administración, promueve una cuenta ya registrada:

```bash
# Con MONGODB_URI definida en apps/backend/.env
npm run make-admin -w backend -- tu-correo@dcc.uchile.cl
```

- Imprime `Listo: <usuario> ahora es administrador.`, o `<usuario> ya era administrador.` si ya lo era (puede ejecutarse varias veces).
- Si no existe una cuenta con ese correo, imprime `No existe una cuenta con el correo <correo>.` y termina con código 1.
- Sin argumento, con un correo inválido o sin `MONGODB_URI`, imprime un mensaje en español y termina con código 1 sin conectarse a la base.
- El correo se compara en minúsculas y sin espacios, igual que lo guarda el modelo.

Abre `http://localhost:5173` en el navegador. Inicio, catálogo, detalle, autenticación, perfil y publicaciones usan la API: necesitan el backend, MongoDB y haber ejecutado el seed para ver productos.

## Funcionalidad actual (specs 001–009)

Tienda con enrutamiento de hash (funciona por URL directa y con recarga). Estética "IDE institucional" (tema oscuro, specs/00-design-system).

| URL | Vista |
|---|---|
| `http://localhost:5173/#/` | Inicio: marca, accesos de sesión y productos destacados |
| `http://localhost:5173/#/registro` | Registro (nombre de usuario, nombre a mostrar, correo, contraseña y confirmación) |
| `http://localhost:5173/#/iniciar-sesion` | Inicio de sesión (correo y contraseña) |
| `http://localhost:5173/#/catalogo` | Catálogo con búsqueda por nombre, orden, rango de precios, filtro por categoría y páginas de 9, todo en la URL |
| `http://localhost:5173/#/producto/:id` | Detalle con agregar al carrito y a favoritos |
| `http://localhost:5173/#/perfil` | Perfil (solo con sesión): datos editables, carrito, favoritos e historial |
| `http://localhost:5173/#/publicar` | Publicar un producto (solo con sesión): nombre, descripción, categoría, precio en CLP e imagen |
| `http://localhost:5173/#/mis-publicaciones` | Mis publicaciones (solo con sesión): lista, editar y eliminar con confirmación |
| `http://localhost:5173/#/publicaciones/:id/editar` | Editar una publicación propia (solo con sesión y siendo el dueño) |

### Autenticación y sesión (005)

Registro e inicio de sesión reales contra MongoDB: contraseñas con hash (bcryptjs), sesión en JWT firmado (`JWT_SECRET`, 7 días) transportado en cookie `httpOnly` `SameSite=Lax`, y restauración con `GET /api/auth/me`. El frontend consume la API por el proxy de Vite (`/api` → `http://localhost:3001`), con credenciales incluidas. Cerrar sesión no altera el carrito local.

### Modelo `User` y API (005–007)

El documento persiste `username` (único, minúsculas, editable en el perfil), `displayName`, `email`, `passwordHash`, `emailVerified`, `favorites`, `history` y `cart`. Los esquemas Zod viven en `utils/` y se revalidan en el servidor.

| Método y ruta | Descripción |
|---|---|
| `POST /api/auth/register` | Crea la cuenta e inicia sesión (`201`; `409` ante correo o `username` duplicado) |
| `POST /api/auth/login` | Autentica (`200`; `401` genérico ante fallo) |
| `POST /api/auth/logout` | Borra la cookie (`204`, idempotente) |
| `GET /api/auth/me` | Sesión actual (`200` o `401`) |
| `GET /api/users/me` | Perfil con favoritos, historial y carrito |
| `PUT /api/users/me` | Actualiza identidad y correo con contraseña actual (`401`/`409` según el caso) |
| `POST /api/users/me/favorites` · `DELETE /api/users/me/favorites/:id` | Favoritos idempotentes por cuenta |
| `POST /api/users/me/history` | Visitas (tope 67, recientes primero) |
| `PUT /api/users/me/cart` | Reemplazo validado del carrito de la cuenta |

### Productos y publicaciones (008)

Los productos viven en MongoDB (modelo `Product`, con `seller` apuntando al usuario). Cualquier visitante los lee; solo el dueño los crea, edita y borra. Las imágenes se suben como data URL JPG/PNG/WebP (≤ 1 MB; el navegador las redimensiona a 1200 px y las comprime), pero la API nunca las devuelve inline: las sirve en `/api/products/:id/image?v=…` con caché inmutable.

| Método y ruta | Descripción |
|---|---|
| `GET /api/products` | Listado público (`?categoria=`, `?featured=true`, `?ids=a,b` y, para el catálogo, `?q=`, `?orden=recientes\|precio-menor\|precio-mayor\|nombre`, `?min=`, `?max=`, `?pagina=` con respuesta paginada `{ products, total, pagina, porPagina, totalPaginas }` de 9 por página) |
| `GET /api/products/mine` | Publicaciones del usuario (`401` sin sesión) |
| `GET /api/products/:id` · `GET /api/products/:id/image` | Detalle público e imagen |
| `POST /api/products` | Publica (`201`; `400` por campo; `413` sobre 2 MB) |
| `PATCH /api/products/:id` | Edición parcial del dueño (`403` si no lo es; `404`) |
| `DELETE /api/products/:id` | Borra (`204`) y quita el id de favoritos, historial y carrito de todas las cuentas |

Detalles verificables: `specs/008-product-publications/` y `specs/009-product-search/`.

El carrito vive en `localStorage` (clave `cart`) y se sincroniza con la cuenta: al iniciar sesión fusiona lo invitado sumando cantidades (con aviso), sin duplicar en recargas; favoritos e historial son por cuenta. Detalles verificables: `specs/005-user-auth/`, `specs/006-user-profile/` y `specs/007-profile-polish/` (spec, plan y tareas de cada una).

## Tests

```bash
npm run check   # ESLint + tipos + tests
```

ESLint (`eslint.config.mjs`, spec 017) prohíbe `any` explícito y revisa las reglas de los hooks de React; las variables y parámetros sin uso los detecta `tsc` (`noUnusedLocals`/`noUnusedParameters` activos en frontend, backend y `utils`).

### Tests E2E (Playwright)

Viven en `e2etests/` (spec 016) y cubren login + rutas protegidas (incluidos F5 y
atrás/adelante), el CRUD de publicaciones y el carrito. No requieren MongoDB
instalado: Playwright levanta el backend con `NODE_ENV=test` y una base en
memoria, más el frontend Vite. Detén `npm run dev` antes de ejecutarlos (usan los
puertos 3001 y 5173).

```bash
npm run e2e:install   # una vez: dependencias de e2etests/ y Chromium
npm run e2e           # ejecuta la suite
```

Instrucciones completas, modos (`--ui`, `--headed`, reporte) y problemas
frecuentes en [`e2etests/README.md`](e2etests/README.md).

### Estado global (Zustand)

La sesión y el carrito viven en dos stores de Zustand (spec 015):
`apps/frontend/client/src/stores/authStore.ts` y `stores/cartStore.ts`. Los
componentes los leen con `useAuth()`/`useCart()` (selectores sobre los stores);
`components/SessionSync.tsx` restaura la sesión al cargar y
`components/CartSync.tsx` (con `logic/useCartSync.ts`) sincroniza el carrito con
`localStorage` y con la cuenta.

La estrategia de tests por spec está en `specs/<id>/plan.md`. La lógica pura y el backend (p. ej. esquemas Zod, fusión del carrito, servicios y rutas con `mongodb-memory-server`) exigen cobertura; la presentación pura no.