# tiendaDCC

Página web de venta de productos del Departamento de Ciencias de la Computación (DCC) de la Universidad de Chile (tazas, poleras, stickers, etc.).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind v4 |
| Backend | Express + Mongoose (MongoDB) |
| Base de datos | MongoDB (modelo `User`) |
| Validación | Zod (esquemas compartidos en `utils/`) |
| Tests | Vitest + Testing Library + supertest |

La constitución del proyecto vive en `docs/constitution.md`; define las reglas de stack, orden de trabajo, separación de lógica/UI, política de tests, persistencia e idioma.

## Estructura del repositorio

```
apps/frontend/client/   Aplicación React (componentes, páginas, hooks, lógica)
apps/backend/           Backend Express (rutas, controladores, servicios, modelos)
utils/                  Esquemas Zod y tipos compartidos (@tiendadcc/utils)
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
| `MONGODB_URI` | Sí | — | Cadena de conexión de MongoDB (p. ej. `mongodb://localhost:27017/tiendadcc`). |
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
| `npm run check` | Verifica tipos (`tsc --noEmit`) y ejecuta los tests (Vitest) de `utils`, backend y frontend |
| `npm run build` | Compila la app a `apps/frontend/client/dist` |

## Cómo correr el proyecto

```bash
npm run dev            # frontend en http://localhost:5173
npm run dev -w backend # API en http://localhost:3001 (otra terminal)
```

### Seed de productos (spec 008)

Carga el catálogo inicial (`apps/backend/src/seed/products.json`: Taza, Polera y Sticker DCC) en MongoDB, con sus imágenes `/images/...` y a nombre del vendedor de prueba `tiendadcc` (`vendedor@tiendadcc.cl`).

```bash
# 1. En apps/backend/.env define MONGODB_URI y SEED_SELLER_PASSWORD (≥ 8 caracteres)
# 2. Con MongoDB en marcha:
npm run seed -w backend
```

- Valida el entorno antes de conectar: si falta `SEED_SELLER_PASSWORD` (o `MONGODB_URI`) termina con un mensaje en español y no escribe nada.
- Es **idempotente**: crea el vendedor solo si no existe (no cambia su contraseña si ya existe) y actualiza los productos por vendedor + nombre, sin duplicarlos.
- Reemplaza los ids antiguos (`taza-dcc`, `polera-dcc`, `sticker-dcc`) por los `_id` nuevos en los favoritos, el historial y el carrito de las cuentas existentes; las demás referencias no se tocan.
- Crea los productos del último al primero, de modo que el listado público (del más reciente al más antiguo) conserve el orden del JSON: Taza, Polera, Sticker. En una base ya sembrada con una versión anterior el orden no cambia al re-ejecutar; para reordenar hay que borrar esos productos y volver a correr el seed.
- Escribe en la base indicada por `MONGODB_URI`: revisa que apunte a desarrollo antes de ejecutarlo.

Abre `http://localhost:5173` en el navegador. Inicio, catálogo, detalle, autenticación, perfil y publicaciones usan la API: necesitan el backend, MongoDB y haber ejecutado el seed para ver productos.

## Funcionalidad actual (specs 001–008)

Tienda con enrutamiento de hash (funciona por URL directa y con recarga). Estética "IDE institucional" (tema oscuro, specs/00-design-system).

| URL | Vista |
|---|---|
| `http://localhost:5173/#/` | Inicio: marca, accesos de sesión y productos destacados |
| `http://localhost:5173/#/registro` | Registro (nombre de usuario, nombre a mostrar, correo, contraseña y confirmación) |
| `http://localhost:5173/#/iniciar-sesion` | Inicio de sesión (correo y contraseña) |
| `http://localhost:5173/#/catalogo` | Catálogo con filtro por categoría y tarjetas con acciones directas |
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
| `GET /api/products` | Listado público (`?categoria=`, `?featured=true`, `?ids=a,b`) |
| `GET /api/products/mine` | Publicaciones del usuario (`401` sin sesión) |
| `GET /api/products/:id` · `GET /api/products/:id/image` | Detalle público e imagen |
| `POST /api/products` | Publica (`201`; `400` por campo; `413` sobre 2 MB) |
| `PATCH /api/products/:id` | Edición parcial del dueño (`403` si no lo es; `404`) |
| `DELETE /api/products/:id` | Borra (`204`) y quita el id de favoritos, historial y carrito de todas las cuentas |

Detalles verificables: `specs/008-product-publications/`.

El carrito vive en `localStorage` (clave `cart`) y se sincroniza con la cuenta: al iniciar sesión fusiona lo invitado sumando cantidades (con aviso), sin duplicar en recargas; favoritos e historial son por cuenta. Detalles verificables: `specs/005-user-auth/`, `specs/006-user-profile/` y `specs/007-profile-polish/` (spec, plan y tareas de cada una).

## Tests

```bash
npm run check   # tipos + tests
```

La estrategia de tests por spec está en `specs/<id>/plan.md`. La lógica pura y el backend (p. ej. esquemas Zod, fusión del carrito, servicios y rutas con `mongodb-memory-server`) exigen cobertura; la presentación pura no.