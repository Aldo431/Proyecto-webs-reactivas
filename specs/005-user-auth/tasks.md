# Tasks 005 — Autenticación de usuarios

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario del backend, workspace y formularios existentes**
    RF: RF-1…RF-12 (base para todo)
    Hecho cuando: conozco `apps/backend/src/index.ts` (Express sin base de datos), `LoginPage.tsx` y `RegisterPage.tsx` (envío con `preventDefault`, sin efecto), `TextField.tsx` (no controlado), `AuthBar.tsx` (siempre anónimo), el `HashRouter` de `App.tsx`, el sistema de diseño (`specs/00-design-system`) y el plan de dónde aterriza cada módulo nuevo.

## Fase 1 — Workspace y esquemas compartidos (depende de 1)

- [x] **2. Configurar el workspace npm y crear el paquete `utils/`**
    RF: RNF-5
    Hecho cuando: la raíz declara `workspaces` (`apps/frontend/client`, `apps/backend`, `utils`), existe `utils/` con `package.json` (`@tiendadcc/utils` con `zod`) y `tsconfig.json`, y tanto el frontend como el backend resuelven `import` desde `@tiendadcc/utils`.

- [x] **3. Implementar los esquemas Zod compartidos (`authSchemas.ts`)**
    RF: RF-3, RF-9
    Hecho cuando: defino `registerInputSchema` (name 1–80 con `trim`, email válido, password 8–100 y confirmación coincidente), `loginInputSchema` y `publicUserSchema`, exporto sus tipos, y sus tests unitarios (válido, email mal formado, password corta/larga, confirmación distinta, `trim`) pasan.

## Fase 2 — Backend: configuración y modelo (depende de 2, 3)

- [x] **4. Validación de entorno con Zod (`config/env.ts`)**
    RF: RF-11
    Hecho cuando: el backend valida `MONGODB_URI`, `JWT_SECRET`, `PORT`, `NODE_ENV` y `CLIENT_ORIGIN` con Zod y, si falta `MONGODB_URI` o `JWT_SECRET`, aborta con un mensaje en español que nombra la variable y no escucha peticiones; con valores válidos, arranca.

- [x] **5. Conexión a MongoDB (`db/connect.ts`)**
    RF: RF-9
    Hecho cuando: implemento `connectToDatabase()` con Mongoose y el arranque la invoca antes de escuchar, usando la URI ya validada.

- [x] **6. Modelo `User` con email único y salida pública**
    RF: RF-1, RF-9
    Hecho cuando: `models/User.ts` define `name`, `email` (único, en minúsculas, con `trim`), `passwordHash` y `timestamps`, y `toPublicJSON()` devuelve `{ id, name, email }` sin `passwordHash` ni `__v`.

## Fase 3 — Backend: servicio, sesión y rutas (depende de 4, 5, 6)

- [x] **7. Servicio de autenticación (`authService.ts`)**
    RF: RF-1, RF-2, RF-4, RF-9
    Hecho cuando: implemento `hashPassword`/`verifyPassword` (bcryptjs), `signToken`/`verifyToken` (jsonwebtoken con `JWT_SECRET`) y `createUser`/`authenticateUser`/`findUserById` (normalizando el email y con comparación no reveladora), y sus tests unitarios pasan.

- [x] **8. Middleware de sesión y manejador de errores**
    RF: RF-2, RF-4, RF-7, RF-10
    Hecho cuando: `middleware/auth.ts` lee la cookie, verifica el JWT y adjunta el usuario (o responde `401`), y `errorHandler.ts` mapea Zod→`400`, correo duplicado→`409`, credenciales→`401`, DB caída→`503` e interno→`500` con mensajes en español y sin filtrar detalles.

- [x] **9. Rutas y controlador de autenticación (`/register`, `/login`, `/logout`, `/me`)**
    RF: RF-1, RF-2, RF-4, RF-5, RF-10
    Hecho cuando: `routes/authRoutes.ts` + `controllers/authController.ts` revalidan el cuerpo con `@tiendadcc/utils`, responden `201`/`200` con `publicUserSchema` sin `passwordHash`, emiten la cookie `httpOnly` `SameSite=Lax` `Path=/` (y `Secure` en producción), `logout` la borra y responde `204` incluso sin sesión, y `me` responde `200`/`401`.

- [x] **10. Montar la app Express (`app.ts`, `index.ts`)**
    RF: RF-4, RNF-2
    Hecho cuando: la app usa `express.json()`, `cookie-parser`, CORS con credenciales según `CLIENT_ORIGIN`, monta `/api/auth` y el manejador de errores, e `index.ts` conecta la base de datos y escucha en `PORT`.

- [x] **11. Tests de rutas de autenticación**
    RF: RF-1, RF-2, RF-4, RF-5, RF-10
    Hecho cuando: con Vitest + supertest + `mongodb-memory-server` verifico registro `201` (con cookie y sin `passwordHash`), correo duplicado `409`, cuerpo inválido `400`, login `200`/`401` genérico, `me` `200`/`401` y `logout` `204`, y todos pasan.

- [x] **12. Configurar `check` del backend y de la raíz**
    RF: RNF-10
    Hecho cuando: el backend tiene Vitest configurado y un script `check` (`tsc --noEmit` + tests), y el `npm run check` de la raíz ejecuta frontend y backend, pasando en verde.

## Fase 4 — Frontend: entorno, cliente y sesión (depende de 3, 9)

- [x] **13. Validar el entorno y configurar el proxy de Vite**
    RF: RF-11, RF-4, RNF-2
    Hecho cuando: `logic/env.ts` valida `VITE_API_URL` con Zod (por defecto `""`) y falla con mensaje claro si es inválida, y `vite.config.ts` hace proxy de `/api` a `http://localhost:3001`.

- [x] **14. Cliente de API de autenticación (`authApi.ts`)**
    RF: RF-1, RF-2, RF-4, RF-5, RF-10
    Hecho cuando: implemento `register`, `login`, `logout` y `fetchCurrentUser` con `credentials: "include"`, valido las respuestas con `publicUserSchema` y traduzco `400`→errores por campo, `401`→mensaje genérico y `409`→mensaje de duplicado, y sus tests con `fetch` simulado pasan.

- [x] **15. Contexto y hook de sesión (`AuthContext.tsx`, `useAuth`)**
    RF: RF-4, RF-6, RF-8, RNF-11
    Hecho cuando: expongo el estado discriminado `loading | anonymous | authenticated`, restauro la sesión con `fetchCurrentUser` al montar y expongo `register`/`login`/`logout`/`refresh`, y sus tests cubren `loading→authenticated`/`anonymous` y login/logout.

## Fase 5 — Frontend: formularios y accesos (depende de 3, 15)

- [x] **16. Extender `TextField` controlado con error accesible**
    RF: RF-12, RNF-4
    Hecho cuando: `TextField` acepta `value`, `onChange`, `name` y `error`, muestra el mensaje en español y asocia el campo con `aria-invalid="true"` y `aria-describedby` cuando hay error.

- [x] **17. Implementar `LoginPage` funcional**
    RF: RF-2, RF-7, RF-12
    Hecho cuando: el formulario de correo y contraseña valida con `loginInputSchema`, muestra errores por campo y el `401` genérico en español sin perder datos, deshabilita el botón durante el envío y, al autenticar, refleja la sesión y navega a `/`.

- [x] **18. Implementar `RegisterPage` funcional**
    RF: RF-1, RF-3, RF-7, RF-12
    Hecho cuando: el formulario de nombre, correo, contraseña y confirmación valida con `registerInputSchema` (incluida la coincidencia), muestra errores por campo y el `409` en español sin perder datos, no permite doble envío y, al registrar, inicia sesión y navega a `/`.

- [x] **19. `AuthBar` y guarda de rutas reflejando la sesión**
    RF: RF-6, RF-8
    Hecho cuando: `AuthBar` muestra registro/inicio si es anónimo y nombre + "Cerrar sesión" si está autenticado (estado neutro durante `loading`), y `App.tsx` monta `AuthProvider` y redirige a `/` cuando un usuario autenticado visita `/registro` o `/iniciar-sesion`.

- [x] **20. Actualizar los tests existentes afectados**
    RF: RF-1, RF-2, RF-6, RF-8
    Hecho cuando: actualizo `App.test.tsx`, `LoginPage.test.tsx` y `RegisterPage.test.tsx` a la nueva UI (incluido el contexto de sesión) sin eliminar aserciones que sigan vigentes, y pasan.

## Fase 6 — Verificación y cierre (depende de 12, 20)

- [x] **21. Verificación QA según criterios de finalización y accesibilidad**
    RF: RF-1…RF-12, RNF-1…RNF-11
    Hecho cuando: verifico manualmente registro y login reales con MongoDB, recarga F5 que mantiene la sesión, cookie `httpOnly` invisible en `document.cookie`, redirección de las rutas de autenticación, "Cerrar sesión" sin alterar el carrito, ausencia de parpadeo del estado autenticado, y teclado, foco y etiquetas en español.

- [x] **22. Cierre: `npm run check` en verde**
    RF: RNF-10, criterio de finalización 12
    Hecho cuando: `npm run check` (tipos de frontend y backend + tests + build) pasa sin errores y anoto el resultado en la respuesta final.
