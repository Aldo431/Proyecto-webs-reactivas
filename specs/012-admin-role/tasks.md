# Tasks 012 — Rol de administrador

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde. Un commit local por fase.

## Fase 0 — Base

- [x] **1. Inventario 012**
    RF: RF-1…RF-8 (base para todo)
    Hecho cuando: conozco `models/User.ts` (`toPublicJSON`, normalización de legados), `middleware/auth.ts` (`requireAuth` lee el usuario de MongoDB en cada solicitud), `errors.ts` (`ForbiddenError`), `utils/src/authSchemas.ts` (`publicUserSchema`), `scripts/seed.ts` + `seed/seedEnv.ts` (patrón de script), `OnlyAuthenticatedRoute.tsx`, `Header.tsx`, `App.tsx`, los mocks de `PublicUser` en tests y la spec 00.

## Fase 1 — Esquemas compartidos (depende de 1)

- [x] **2. `USER_ROLES`, `userRoleSchema` y `role` en `publicUserSchema`**
    RF: RF-1, RF-3
    Hecho cuando: `utils` exporta `USER_ROLES`, `userRoleSchema` y `UserRole`; `publicUserSchema` exige `role`; los tests de utils cubren `user`, `admin`, valor inválido y ausencia, y pasan.

## Fase 2 — Backend (depende de 2)

- [ ] **3. Campo `role` en `User` y `toPublicJSON`**
    RF: RF-1, RF-3
    Hecho cuando: el modelo tiene `role` con enum y default `"user"`; `toPublicJSON` devuelve `role` (legado sin campo → `"user"`); un test inserta un documento sin `role` y lo verifica.

- [ ] **4. Ajustar mocks y tests existentes del backend**
    RF: RF-3
    Hecho cuando: los tests de auth, users, products y reviews que comparan usuarios públicos esperan `role`, y `npm run check -w backend` vuelve a verde.

- [ ] **5. `requireAdmin`, `/api/admin` y `GET /api/admin/session`**
    RF: RF-4
    Hecho cuando: existen `requireAdmin`, `adminRoutes.ts`, `adminController.ts` y el montaje en `app.ts`; `adminRoutes.test.ts` cubre 401, 403 (con el mensaje exacto), 200 y el cambio de rol aplicado sin nuevo login.

- [ ] **6. El rol no se asigna desde la API pública**
    RF: RF-2
    Hecho cuando: hay tests de que `POST /api/auth/register` y `PUT /api/users/me` con `"role": "admin"` dejan la cuenta en `"user"`, y pasan.

- [ ] **7. `adminRoleService.ts` (`parseMakeAdminInput`, `grantAdminRole`)**
    RF: RF-5
    Hecho cuando: `adminRoleService.test.ts` cubre granted, already-admin, not-found, correo con mayúsculas/espacios, falta de argumento, correo inválido y falta de `MONGODB_URI`, y pasa.

- [ ] **8. Script `make-admin`**
    RF: RF-5
    Hecho cuando: existe `scripts/makeAdmin.ts` y el script `make-admin` en `apps/backend/package.json`; al correr `npm run make-admin -w backend -- <mi correo>` contra la base local imprime "Listo: <usuario> ahora es administrador."; una segunda vez imprime "ya era administrador"; con un correo inexistente termina con código 1. README actualizado con el comando.

## Fase 3 — Frontend: acceso (depende de 2)

- [ ] **9. Ajustar mocks del cliente**
    RF: RF-3
    Hecho cuando: `test/authMocks.ts` y demás `PublicUser` de prueba incluyen `role: "user"` y `npm run check -w tiendadcc-client` pasa sin otros cambios.

- [ ] **10. `logic/adminAccess.ts` y `logic/adminSections.ts`**
    RF: RF-6, RF-7, RF-8
    Hecho cuando: `resolveAdminAccess`, `isAdmin`, la lista de secciones e `isActiveSection` están implementados y sus tests (los cuatro estados de acceso; Resumen activo solo en `/admin` exacto) pasan.

- [ ] **11. `OnlyAdminRoute`**
    RF: RF-6
    Hecho cuando: `guards.test.tsx` cubre loading (nada), anónimo (login con `state.from`), usuario (redirige a `/`) y admin (renderiza), y pasa.

## Fase 4 — Frontend: armazón del panel (depende de 10, 11)

- [ ] **12. `AdminLayout` y las cuatro páginas**
    RF: RF-7
    Hecho cuando: la barra lateral sigue el mockup (marca + insignia "admin", nav con íconos y `aria-current`, "Volver a la tienda", tarjeta del admin); las páginas muestran `h1` y descripción; bajo 768 px la nav es una fila de pestañas desplazable y no hay scroll horizontal en 360 px; `AdminLayout.test.tsx` pasa.

- [ ] **13. Rutas anidadas en `App.tsx`**
    RF: RF-6, RF-7
    Hecho cuando: `#/admin`, `#/admin/productos`, `#/admin/usuarios` y `#/admin/resenas` renderizan dentro de `OnlyAdminRoute` + `AdminLayout`.

- [ ] **14. Enlace "Administración" en el encabezado**
    RF: RF-8
    Hecho cuando: solo con rol `admin` aparece en escritorio y en la hamburguesa; `Header.test.tsx` cubre anónimo, usuario y admin.

## Fase 5 — Cierre

- [ ] **15. Prueba manual y check**
    RF: todos
    Hecho cuando: con la base local, `make-admin` sobre mi cuenta; mi cuenta ve "Administración" y navega las cuatro secciones; una cuenta normal (ventana de incógnito) no ve el enlace, es redirigida desde `#/admin` y recibe 403 en `http://localhost:5173/api/admin/session`; `npm run check` en verde.
