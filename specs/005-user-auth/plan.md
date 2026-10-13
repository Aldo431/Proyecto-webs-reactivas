# Plan 005 — Autenticación de usuarios

Plan de implementación para la spec `005-user-auth`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-12. Cada sección indica qué RF atiende.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12.*

Primera funcionalidad con **backend real**. Se introduce un **workspace npm** en la raíz para compartir los esquemas Zod (RNF-5) y se completa el backend Express existente. La lógica de negocio vive en servicios del backend y en funciones/hooks puros del frontend, nunca en los componentes (§3).

- **Esquemas compartidos** — `utils/` (nuevo paquete `@tiendadcc/utils`) *(RF-3, RF-9)*
  - `src/authSchemas.ts`: esquemas Zod y tipos derivados usados por frontend y backend:
    - `registerInputSchema` = `{ name, email, password, passwordConfirm }` con `trim`, email válido, `password` 8–100, `name` 1–80 y `refine` de coincidencia de confirmación.
    - `loginInputSchema` = `{ email, password }` con `trim` y email válido.
    - `publicUserSchema` = `{ id, name, email }` (contrato de respuesta, sin `passwordHash`).
  - `src/index.ts`: barrel de exportación. `package.json`/`tsconfig.json` del paquete; se agrega `workspaces: ["apps/frontend/client", "apps/backend", "utils"]` en el `package.json` raíz.

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1, RF-2, RF-4, RF-5, RF-9, RF-10, RF-11)*
  - `config/env.ts`: validación Zod de `MONGODB_URI`, `JWT_SECRET`, `PORT`, `NODE_ENV` y `CLIENT_ORIGIN`; aborta con mensaje en español si falta o es inválida *(RF-11)*.
  - `db/connect.ts`: conexión a MongoDB con Mongoose *(RF-9)*.
  - `models/User.ts`: modelo Mongoose (`name`, `email` único y en minúsculas, `passwordHash`, `timestamps`); `toPublicJSON()` elimina `passwordHash` y `__v` *(RF-1, RF-9)*.
  - `services/authService.ts`: lógica pura/aislada: `hashPassword`, `verifyPassword` (bcryptjs), `signToken`, `verifyToken` (jsonwebtoken), `createUser`, `authenticateUser`, `findUserById` *(RF-1, RF-2, RF-9)*.
  - `middleware/auth.ts`: lee la cookie, verifica el JWT y adjunta `req.user`; `requireAuth` responde `401` si no hay sesión *(RF-4, RF-10)*.
  - `routes/authRoutes.ts` + `controllers/authController.ts`: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; revalidan el cuerpo con `@tiendadcc/utils` y emiten/borran la cookie `httpOnly` *(RF-1, RF-2, RF-4, RF-5, RF-10)*.
  - `errors.ts` / `errorHandler.ts`: traduce Zod→`400`, correo duplicado→`409`, credenciales→`401`, caída de DB→`503` y errores internos→`500`, con mensajes en español y sin filtrar detalles *(RF-1, RF-2, RF-7, RF-10; casos límite)*.
  - `app.ts` / `index.ts`: arma la app (JSON, `cookie-parser`, CORS con credenciales opcional en prod), monta `/api/auth` y el manejador de errores *(RF-4, RNF-2)*.

- **Lógica pura del frontend** — `src/logic/` *(RF-1, RF-2, RF-4, RF-5, RF-10, RF-11)*
  - `env.ts`: valida `VITE_API_URL` con Zod (por defecto `""`, que usa el proxy same-origin) *(RF-11)*.
  - `authApi.ts`: cliente de API con `credentials: "include"`; `register`, `login`, `logout`, `fetchCurrentUser`; convierte estados HTTP en resultados tipados (`ok` | `fieldErrors` | `message`) y valida las respuestas con `publicUserSchema` *(RF-1, RF-2, RF-4, RF-5, RF-10)*.

- **Estado de sesión** — `src/context/` *(RF-4, RF-6, RF-8)*
  - `AuthContext.tsx` + `useAuth()`: estado discriminado `loading | anonymous | authenticated` (RNF-11); restaura la sesión con `fetchCurrentUser` al montar; expone `register`, `login`, `logout` y `refresh` *(RF-4, RF-6, RF-8)*.

- **Presentación** — `src/pages/` y `src/components/` *(RF-1, RF-2, RF-6, RF-7, RF-8, RF-12)*
  - `LoginPage.tsx`: formulario controlado de correo y contraseña; valida con `loginInputSchema`, llama a `login`, muestra errores en español y redirige al inicio *(RF-2, RF-7, RF-12)*.
  - `RegisterPage.tsx`: formulario controlado con nombre, correo, contraseña y confirmación de contraseña; valida con `registerInputSchema`, llama a `register`, muestra errores y redirige *(RF-1, RF-7, RF-12)*.
  - `TextField.tsx`: se extiende a controlado con `value`, `onChange`, `name` y `error`; asocia el error con `aria-invalid` y `aria-describedby` *(RF-12, RNF-4)*.
  - `AuthBar.tsx`: refleja el estado de sesión: accesos de registro/inicio si es anónimo; nombre + "Cerrar sesión" si está autenticado; estado neutro mientras carga *(RF-6)*.
  - `App.tsx`: envuelve las rutas con `AuthProvider` y agrega una guarda en `/registro` y `/iniciar-sesion` que redirige a `/` si hay sesión *(RF-8)*.

- **Proxy de desarrollo** — `apps/frontend/client/vite.config.ts` *(RNF-2, RF-4)*
  - `server.proxy["/api"] → http://localhost:3001` para que la cookie de sesión sea del mismo sitio (duda resuelta de la spec).

## 2. Modelo de datos
*Cubre: RF-1, RF-9, RF-10.*

Documento de usuario persistido en MongoDB (Mongoose). Claves en inglés; el `passwordHash` **nunca** sale del backend *(RF-1, RF-9)*:

```json
{
  "_id": "6712a4f3c9b1e24a8f0d1234",
  "name": "Ana Pérez",
  "email": "ana@dcc.uchile.cl",
  "passwordHash": "$2b$10$T3rK...hash...",
  "createdAt": "2026-10-12T12:00:00.000Z",
  "updatedAt": "2026-10-12T12:00:00.000Z"
}
```

Contrato público (respuesta de `register`, `login` y `me`), validado con `publicUserSchema`:

```json
{
  "id": "6712a4f3c9b1e24a8f0d1234",
  "name": "Ana Pérez",
  "email": "ana@dcc.uchile.cl"
}
```

Cuerpos de entrada revalidados en el servidor con `@tiendadcc/utils`:

```json
{ "name": "Ana Pérez", "email": "ana@dcc.uchile.cl", "password": "secreto123", "passwordConfirm": "secreto123" }
```

```json
{ "email": "ana@dcc.uchile.cl", "password": "secreto123" }
```

(El `email` se normaliza a minúsculas y se recorta antes de comparar; `passwordConfirm` solo existe en el registro y no llega al backend. La sesión no se guarda en `localStorage`: viaja en una cookie `httpOnly`, coherente con RF-4 y RNF-3.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Backend con Express.**
- Justificación: la spec 005 ratifica Express (duda resuelta) por coherencia con `AGENTS.md`, `README.md` y el código real (`apps/backend/src/index.ts`), y permite reutilizar el servidor ya existente *(RNF-2)*.
- Alternativa descartada: **Hono**. La constitución §1 lo nombra, pero ningún archivo del repo lo usa; migrar contradice la simplicidad y deja la constitución como pendiente de corregir, no al código.

**D2 — Sesión con JWT en cookie `httpOnly` (`SameSite=Lax`), no token en `localStorage`.**
- Justificación: RF-4 y RNF-3 exigen que la sesión no sea accesible por JavaScript y que persista entre recargas; la cookie `httpOnly` evita el robo por XSS y `SameSite=Lax` mitiga CSRF sin dependencias extra *(RF-4, RF-5, RNF-3)*.
- Alternativa descartada: **JWT en `localStorage` enviado como `Authorization: Bearer`**. Expone el token a XSS y contradice RNF-3.

**D3 — Esquemas Zod compartidos en `utils/` vía workspace npm.**
- Justificación: RNF-5 y la duda resuelta exigen una sola fuente de reglas para frontend y backend; el workspace (desbloquea el pendiente de `specs/home`) permite `import` directo de `@tiendadcc/utils` en ambos lados *(RF-3, RNF-5, AGENTS.md)*.
- Alternativa descartada: **duplicar los esquemas en cada app**. Dos fuentes de verdad que divergen; ya fue lo que motivó el pendiente de `utils/`.

**D4 — Hash de contraseñas con bcryptjs (costo 10–12).**
- Justificación: RNF-3 exige almacenar solo el hash con salt. `bcryptjs` es puro JavaScript (sin compilación nativa) y suficientemente robusto para el proyecto *(RF-1, RF-9, RNF-3)*.
- Alternativa descartada: **`argon2`**. Es más moderno, pero requiere binarios nativos y complica el entorno; **guardar texto plano** queda descartado por seguridad evidente.

**D5 — Modelo de usuario con Mongoose en el backend, email único en minúsculas.**
- Justificación: §5 y AGENTS.md mandan que toda persistencia pase por modelos Mongoose; el índice único sobre `email` normalizado implementa el `409` de RF-1/RF-9 *(RF-1, RF-9)*.
- Alternativa descartada: **driver nativo de MongoDB**. Pierde esquema, validación e índice declarativo, y contradice AGENTS.md.

**D6 — Consumo de la API por proxy de Vite `/api` en desarrollo.**
- Justificación: la duda resuelta de la spec fija el proxy; así la cookie es del mismo sitio y se evita CORS con credenciales en cada llamada *(RF-4, RNF-2)*.
- Alternativa descartada: **CORS con credenciales y `VITE_API_URL` cross-origin**. Añade configuración de CORS, `SameSite=None` y fragilidad en las cookies; se reserva para entornos desplegados.

**D7 — Estado de sesión con React Context y estado discriminado.**
- Justificación: RF-4 y RNF-11 piden exponer `loading | anonymous | authenticated` sin que los componentes conozcan la API; Context nativo de React 19 basta y permite restaurar la sesión en un solo lugar *(RF-4, RF-6, RNF-11)*.
- Alternativa descartada: **Zustand/Redux**. Dependencias fuera del stack sin justificación (§1).

**D8 — `TextField` controlado con soporte de error accesible.**
- Justificación: RF-12 y RNF-4 exigen `aria-invalid`/`aria-describedby` y mensajes por campo; un campo controlado con props tipadas concentra el patrón accesible sin duplicarlo en cada formulario *(RF-7, RF-12, RNF-4)*.
- Alternativa descartada: **campos no controlados con `ref` y validación al enviar**. Dificulta mostrar/limpiar errores por campo y el estado de envío.

**D9 — Errores de autenticación genéricos y mapeo centralizado de estados HTTP.**
- Justificación: RF-2 y RNF-3 prohíben revelar si falló el correo o la contraseña; un manejador de errores mapea Zod→`400`, duplicado→`409`, credenciales→`401` y DB caída→`503` con mensajes en español *(RF-2, RF-7, RF-10)*.
- Alternativa descartada: **devolver el error interno de Mongo o diferenciar "correo no existe" / "contraseña incorrecta"**. Filtra información y rompe los casos límite de la spec.

**D10 — Tests de backend con Vitest + supertest + mongodb-memory-server; `check` de raíz agregado.**
- Justificación: §4 exige tests de la lógica de negocio; `mongodb-memory-server` prueba el flujo real (índice único incluido) sin una MongoDB externa, y el `npm run check` raíz debe cubrir frontend y backend (RNF-10) *(criterio de finalización 12)*.
- Alternativa descartada: **probar contra una MongoDB real o no probar el backend**. La primera vuelve frágil el entorno de CI; la segunda viola §4.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 12.*

- **Lógica pura obligatoria (§4):**
  - `utils`: `registerInputSchema` acepta un registro válido, recorta espacios y normaliza; rechaza email mal formado, `name` vacío, contraseña <8 o >100 y confirmación distinta; `loginInputSchema` rechaza email inválido y contraseña vacía. *(Verifica RF-3)*
  - Backend `authService`: `hashPassword` no devuelve la contraseña y `verifyPassword` la acepta; `signToken`/`verifyToken` producen y validan un JWT. *(Verifica RF-4, RF-9)*
  - Frontend `authApi`: mapea `201/200` a usuario válido, `400` a `fieldErrors`, `401` a mensaje genérico y `409` a mensaje de duplicado (con `fetch` simulado). *(Verifica RF-1, RF-2, RF-7)*
  - Frontend `env`: rechaza `VITE_API_URL` mal formada y acepta vacío/relativa. *(Verifica RF-11)*
- **Backend (rutas/controladores, §4):**
  - `POST /api/auth/register`: válido → `201` + cookie + sin `passwordHash`; correo duplicado → `409`; cuerpo inválido → `400`. *(Verifica RF-1, RF-3, RF-9)*
  - `POST /api/auth/login`: credenciales válidas → `200` + cookie; inválidas → `401` genérico. *(Verifica RF-2)*
  - `GET /api/auth/me`: con cookie → `200` con datos públicos; sin cookie → `401`. *(Verifica RF-4, RF-10)*
  - `POST /api/auth/logout`: limpia la cookie y responde `204`, incluso sin sesión. *(Verifica RF-5)*
  - `env`: falta `MONGODB_URI`/`JWT_SECRET` → el arranque falla con mensaje. *(Verifica RF-11)*
- **Frontend (smoke de render, no exige cobertura, §4):**
  - `LoginPage`/`RegisterPage`: muestran sus campos, validan localmente con mensajes en español, deshabilitan el botón durante el envío y redirigen al autenticar. *(RF-1, RF-2, RF-7, RF-12)*
  - Contexto `useAuth`: `loading` → `authenticated`/`anonymous` al restaurar; `login`/`logout` cambian el estado. *(RF-4, RF-6)*
  - `AuthBar`: accesos anónimos vs. nombre + "Cerrar sesión" según el estado. *(RF-6)*
- **Verificación de contrato por QA (manual):**
  - Registro y login reales contra el backend con MongoDB; recarga (F5) mantiene la sesión.
  - La cookie es `httpOnly` (invisible en `document.cookie`).
  - Usuario autenticado en `/registro` o `/iniciar-sesion` redirige a `/`.
  - Cierre de sesión no altera el carrito de `localStorage`.
  - Sin parpadeo erróneo del estado autenticado durante la restauración.
- **Red / mocking:** en backend se sustituye MongoDB con `mongodb-memory-server`; en frontend se simula `fetch` en los tests de `authApi`. Los tests de lógica no tocan la red real.
- **Comando de cierre:** `npm run check` en la raíz, ampliado para ejecutar `tsc --noEmit` + Vitest de **frontend y backend**, debe pasar antes de dar por terminada la tarea.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `utils/authSchemas.ts` + workspace | RF-3 |
| `authService` + `models/User.ts` + `POST /register` | RF-1, RF-9 |
| `POST /login` + errores genéricos | RF-2 |
| Cookie `httpOnly` + `GET /me` + `middleware/auth` | RF-4, RF-10 |
| `POST /logout` | RF-5 |
| `AuthContext` + `AuthBar` | RF-6, RNF-11 |
| `LoginPage` + `RegisterPage` + `TextField` + errores | RF-7, RF-12 |
| Guarda de rutas en `App.tsx` | RF-8 |
| `config/env.ts` + `logic/env.ts` | RF-11 |
| Proxy de Vite `/api` | RNF-2, RF-4 |
| Tests de lógica pura y backend en Vitest | verificación RF-1…RF-12 (§4) |

---

*Nota:* la spec 005 no deja dudas abiertas; sus tres dudas (Express, workspace `utils/`, proxy Vite) fueron resueltas. El plan asume los valores más conservadores ya fijados en la spec: cookie `httpOnly` `SameSite=Lax`, hash bcryptjs costo 10–12, errores de login genéricos y sin sincronizar el carrito (004) con la cuenta. Queda como pendiente externo actualizar la constitución §1 (Hono → Express). El siguiente paso según el flujo es generar `specs/005-user-auth/tasks.md` (fuera de esta skill).
