# Plan 012 — Rol de administrador

Plan de implementación para la spec `012-admin-role`. Respeta la constitución (§1–§6) y AGENTS.md, y cubre RF-1 a RF-8. Cada sección indica qué RF atiende.

## 1. Esquemas compartidos — `utils/`
*Cubre: RF-1, RF-3.*

- `utils/src/authSchemas.ts`:
  - `export const USER_ROLES = ["user", "admin"] as const;`
  - `export const userRoleSchema = z.enum(USER_ROLES);` y `export type UserRole = z.infer<typeof userRoleSchema>;`
  - `publicUserSchema` agrega `role: userRoleSchema` (obligatorio).
- `registerRequestSchema` **no** cambia: no conoce `role`, así que Zod lo descarta del cuerpo (RF-2).
- Tests en `authSchemas.test.ts`: `publicUserSchema` acepta `user` y `admin`, rechaza otro valor y rechaza la ausencia de `role`.

## 2. Backend — `apps/backend/src/`
*Cubre: RF-1 a RF-5.*

### Modelo
- `models/User.ts`:
  - `UserFields.role: UserRole`.
  - Campo `role: { type: String, enum: { values: [...USER_ROLES], message: "Rol inválido." }, default: "user" }`.
  - `toPublicJSON()` agrega `role: this.role ?? "user"` (cuentas legadas, RF-1).

### Autorización
- `middleware/auth.ts`: nuevo `requireAdmin: RequestHandler`. Supone que `requireAuth` ya corrió y dejó `request.user`; si `request.user?.role !== "admin"` lanza `ForbiddenError("Solo un administrador puede realizar esta acción.")`. Como `requireAuth` lee el usuario desde MongoDB en cada solicitud, un cambio de rol se aplica de inmediato (RF-3) sin tocar el JWT.
- `types/express.d.ts` no cambia: `request.user` ya es `PublicUser`, que ahora trae `role`.

### Rutas
- `routes/adminRoutes.ts` (nuevo): `adminRoutes.use(requireAuth, requireAdmin)`; `GET /session` → `getAdminSession`.
- `controllers/adminController.ts` (nuevo): `getAdminSession` responde `200 { role: "admin" }`.
- `app.ts`: `app.use("/api/admin", adminRoutes)`.
- Orden de errores: 401 (sin sesión) antes que 403 (sin rol), igual que en productos.

### Primer administrador
- `services/adminRoleService.ts` (nuevo, testeable con `mongodb-memory-server`):
  - `parseMakeAdminInput(argv: string[], env: Record<string, string | undefined>)` → `{ success: true, email, mongodbUri } | { success: false, message }`. Valida el correo con `emailField` de utils y `MONGODB_URI` como `seedEnv`. Mensaje de uso: "Uso: npm run make-admin -w backend -- <correo>".
  - `grantAdminRole(email: string)` → `{ status: "granted" | "already-admin", username } | { status: "not-found" }`. Normaliza el correo (`trim().toLowerCase()`) y usa `updateOne` con `$set: { role: "admin" }`.
- `scripts/makeAdmin.ts` (nuevo, delgado como `scripts/seed.ts`): parsea, conecta, llama a `grantAdminRole`, imprime el mensaje de RF-5, fija `process.exitCode` y desconecta en `finally`.
- `package.json` (backend): `"make-admin": "node --env-file-if-exists=.env src/scripts/makeAdmin.ts"`.

### Tests backend
- `routes/adminRoutes.test.ts`: sin cookie → 401; usuario normal → 403 con el mensaje; admin → 200 `{ role: "admin" }`; usuario promovido en la base después de iniciar sesión → 200 en la siguiente solicitud sin nuevo login (RF-3).
- `routes/authRoutes.test.ts`: register, login y me incluyen `role: "user"`; register con `"role": "admin"` crea `"user"` (RF-2).
- `routes/usersRoutes.test.ts`: `PUT /me` con `"role": "admin"` no cambia el rol (RF-2).
- `services/adminRoleService.test.ts`: granted, already-admin, not-found, correo con mayúsculas y espacios; `parseMakeAdminInput` sin argumento, con correo inválido y sin `MONGODB_URI`.
- Documento legado insertado sin `role` (con `User.collection.insertOne`) → `toPublicJSON().role === "user"`.

## 3. Frontend — `apps/frontend/client/src/`
*Cubre: RF-6, RF-7, RF-8.*

### Lógica
- `logic/adminAccess.ts` (nuevo): `resolveAdminAccess(state: AuthState): "wait" | "login" | "forbidden" | "allow"`. `loading` → `wait`; `anonymous` → `login`; autenticado con `role !== "admin"` → `forbidden`; admin → `allow`. Más `isAdmin(user: PublicUser | null): boolean` para el encabezado.
- `logic/adminSections.ts` (nuevo): lista única de secciones `{ path, label, description }` para la navegación y los títulos: Resumen (`/admin`), Productos (`/admin/productos`), Usuarios (`/admin/usuarios`), Reseñas (`/admin/resenas`), y `isActiveSection(sectionPath, pathname)` (Resumen solo coincide exacto).

### Componentes
- `components/OnlyAdminRoute.tsx` (nuevo): aplica `resolveAdminAccess`; `wait` → `null`; `login` → `<Navigate to="/iniciar-sesion" replace state={{ from }} />`; `forbidden` → `<Navigate to="/" replace />`.
- `components/admin/AdminLayout.tsx` (nuevo): barra lateral del mockup + `<Outlet />`.
  - Marca `>_ TiendaDCC` (enlace a `/`) con insignia "admin" (`Badge`, fondo `destructive`/ámbar como en el mockup).
  - `<nav aria-label="Administración">` con íconos de lucide (`LayoutDashboard`, `Package`, `Users`, `MessageSquare`) y `aria-current="page"` en la activa.
  - Pie: "Volver a la tienda" (`ArrowLeft`) y tarjeta con inicial, `displayName` y `@username · administrador`.
  - Responsivo: `flex-col md:flex-row`; bajo `md` la navegación es una fila `overflow-x-auto` de pestañas y se ocultan el pie y la tarjeta.
- `components/Header.tsx`: si `isAdmin(user)`, agrega "Administración" (ícono `Shield`) en la navegación de escritorio y en el menú hamburguesa.

### Páginas
- `pages/admin/AdminOverviewPage.tsx`, `AdminProductsPage.tsx`, `AdminUsersPage.tsx`, `AdminReviewsPage.tsx` (nuevas): por ahora `h1` + descripción tomados de `adminSections.ts`. La de Resumen lleva el único guiño de terminal (`$ sudo tiendadcc --resumen`).

### Rutas — `App.tsx`
```tsx
<Route path="/admin" element={<OnlyAdminRoute><AdminLayout /></OnlyAdminRoute>}>
  <Route index element={<AdminOverviewPage />} />
  <Route path="productos" element={<AdminProductsPage />} />
  <Route path="usuarios" element={<AdminUsersPage />} />
  <Route path="resenas" element={<AdminReviewsPage />} />
</Route>
```

### Tests frontend
- `logic/adminAccess.test.ts` y `logic/adminSections.test.ts`.
- `components/guards.test.tsx`: casos de `OnlyAdminRoute` (loading, anónimo, usuario, admin).
- `components/Header.test.tsx`: "Administración" visible solo con rol `admin`.
- `components/admin/AdminLayout.test.tsx`: `aria-current` en la sección actual y navegación entre secciones.
- Mocks: `test/authMocks.ts` y cualquier `PublicUser` de prueba agregan `role: "user"` (el esquema ahora lo exige).

## 4. Modelo de datos
*Cubre: RF-1.*

```json
{
  "_id": "…",
  "username": "feli",
  "displayName": "Feli",
  "email": "feli@ug.uchile.cl",
  "role": "admin"
}
```

Respuesta de `GET /api/auth/me`:
```json
{ "id": "…", "username": "feli", "displayName": "Feli", "email": "feli@ug.uchile.cl", "role": "admin" }
```

## 5. Decisiones
- **D1 — El rol vive en MongoDB, no en el JWT.** `requireAuth` ya lee el usuario en cada solicitud, así que leer el rol de ahí no cuesta nada y quitar el rol tiene efecto inmediato.
- **D2 — Script en vez de seed para el primer administrador.** Cada integrante tiene su propia base; con `make-admin` cada uno promueve su propia cuenta, y el vendedor del seed sigue siendo solo vendedor.
- **D3 — `/api/admin` con `GET /session`.** Deja montado el enrutador que usará la spec 013 y permite probar 401/403/200 desde ya.
- **D4 — Sin ventas.** El pago es simulado (011) y no hay órdenes; el panel no muestra ventas ni ingresos.
