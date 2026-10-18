# Tasks 010 — Recuperación de contraseña

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario del delta sobre 005–007 e instalación de dependencias**
    RF: RF-1…RF-11 (base para todo)
    Hecho cuando: conozco `authRoutes.ts` (POST /register, POST /login, POST /logout, GET /me), `authController.ts` (register, login, logout, me), `authService.ts` (hashPassword, verifyPassword, authenticateUser, createUser), `User.ts` (sin resetToken), `env.ts` (sin variables SMTP), `authApi.ts` (login, register, logout, me), `LoginPage.tsx` (sin enlace "¿Olvidaste tu contraseña?"), `App.tsx` (sin rutas /recuperar-clave ni /resetear-clave/:token), y las dependencias están instaladas (`npm install nodemailer @types/nodemailer express-rate-limit`) con `npm run check` en verde antes de empezar.

## Fase 1 — Utils: esquemas compartidos (depende de 1)

- [x] **2. Esquemas de forgot/reset/validate en `@tiendadcc/utils`**
    RF: RF-5
    Hecho cuando: `utils/src/authSchemas.ts` exporta `forgotPasswordInputSchema` (email válido con trim), `resetPasswordInputSchema` (token hex de 64 caracteres, password 8–100 caracteres), `validateResetTokenResponseSchema` (`{ valid: boolean }`) y sus tipos inferidos, reexportados desde `index.ts`; los tests en `authSchemas.test.ts` verifican email válido/inválido, token válido/inválido (63, 64, 65 caracteres, no hex), password válida/inválida (corta, larga), y mensajes en español; `npm run check` en verde.

## Fase 2 — Backend: infraestructura (depende de 2)

- [x] **3. Variables SMTP en `env.ts` y `.env.example`**
    RF: RF-2
    Hecho cuando: `env.ts` suma `SMTP_HOST` (string requerido), `SMTP_PORT` (entero requerido), `SMTP_USER` (string requerido), `SMTP_PASS` (string requerido), `SMTP_FROM` (string requerido, email válido), todos opcionales en desarrollo (`NODE_ENV=development`), con mensajes en español; `Env` y `parseEnv` se actualizan; `.env.example` documenta las nuevas variables con comentarios en español; y `npm run check -w backend` compila.

- [x] **4. Modelo `User` con `resetToken` y `resetTokenExpiry`**
    RF: RF-1
    Hecho cuando: `User.ts` suma `resetToken: { type: String, required: false, index: { unique: true, sparse: true, partialFilterExpression: { resetToken: { $ne: null } } } }` y `resetTokenExpiry: { type: Date, required: false }` en el esquema, `UserFields` incluye `resetToken: string | null` y `resetTokenExpiry: Date | null`, ambos por defecto `null`; y `npm run check -w backend` compila.

- [x] **5. Servicio de correo `emailService.ts`**
    RF: RF-2
    Hecho cuando: `services/emailService.ts` crea un transporter de Nodemailer con `smtpTransport({ host, port, secure: port === 465, auth: { user, pass } })` usando las variables del entorno, expone `sendPasswordResetEmail(to, resetUrl)` que envía un correo de texto plano con asunto "Restablecer tu contraseña" y el enlace; en desarrollo (`NODE_ENV=development`), si las variables SMTP no están configuradas, no envía correo y solo imprime el token en consola; y `npm run check -w backend` compila.

- [x] **6. Middleware de rate limiting `rateLimit.ts`**
    RF: RF-4
    Hecho cuando: `middleware/rateLimit.ts` exporta `forgotPasswordRateLimit` usando `express-rate-limit` con window 1 hora, max 5 solicitudes por IP, message "Has excedido el límite de solicitudes. Intenta más tarde.", standardHeaders true (`Retry-After`), legacyHeaders false; los tests verifican el límite por IP y el header `Retry-After`; y `npm run check` en verde.

## Fase 3 — Backend: servicio, controladores y rutas (depende de 3, 4, 5, 6)

- [x] **7. Servicio `passwordResetService.ts` con lógica pura**
    RF: RF-3, RF-4, RF-6, RF-7
    Hecho cuando: `services/passwordResetService.ts` implementa `generateResetToken()` (crypto.randomBytes(32).toString("hex"), 64 caracteres), `createResetToken(email, deps)` (busca usuario, anti-enumeración, rate limit por email con dependencia inyectada, genera token, guarda resetToken/resetTokenExpiry, envía correo, maneja error de envío), `validateResetToken(token, deps)` (busca por token y expiración), `resetPassword(token, newPassword, deps)` (valida token, hashea contraseña, actualiza passwordHash, limpia resetToken/resetTokenExpiry); los tests con deps inyectadas verifican token generado, usuario no existe, rate limit excedido, error de envío, token válido/inválido/expirado, reset exitoso y limpieza; y `npm run check` en verde.

- [x] **8. Controladores y rutas de autenticación**
    RF: RF-3, RF-4, RF-6, RF-7
    Hecho cuando: `authController.ts` suma `forgotPassword` (valida con `forgotPasswordInputSchema`, llama a `createResetToken`, responde 200 genérico, 429 rate limit, 500 error, incluye `devToken` en desarrollo), `validateResetToken` (valida formato token, llama a `validateResetToken`, responde 200 con `{ valid }`), `resetPassword` (valida con `resetPasswordInputSchema`, llama a `resetPassword`, responde 400 token inválido o 200 éxito, limpia cookie de sesión con `clearSessionCookie`); `authRoutes.ts` suma POST /forgot-password (con `forgotPasswordRateLimit`), GET /validate-reset-token/:token, POST /reset-password; y `npm run check -w backend` compila.

- [x] **9. Tests de rutas de recuperación**
    RF: RF-3, RF-4, RF-6, RF-7
    Hecho cuando: con supertest + `mongodb-memory-server` verifico POST /forgot-password (email existe → 200 + token en BD + correo enviado mock, email no existe → 200 genérico sin token ni correo, email inválido → 400, rate limit email → 429, rate limit IP → 429, error envío → 500, `devToken` en desarrollo), GET /validate-reset-token/:token (válido → `{ valid: true }`, no existe/expirado/inválido → `{ valid: false }`), POST /reset-password (válido → 200 + passwordHash actualizado + token limpiado + cookie borrada, inválido/expirado → 400, password inválida → 400, reutilización → 400); y `npm run check` en verde.

## Fase 4 — Frontend: lógica pura (depende de 2, 8)

- [x] **10. Cliente API `authApi.ts`**
    RF: RF-8
    Hecho cuando: `authApi.ts` suma `forgotPassword(email)` (valida email con `emailField`, POST /api/auth/forgot-password, `credentials: "include"`, retorna `ok` + `message` o `AuthFailure` con mensaje en español para 400/429/500/red) y `resetPassword(token, password)` (valida token con regex hex 64 y password con `passwordField`, POST /api/auth/reset-password, retorna `ok` + `message` o `AuthFailure`); los tests con `fetch` simulado verifico 200, 400, 429, 500, red caída, validación local; y `npm run check` en verde.

- [x] **11. Utilidad `resetToken.ts`**
    RF: RF-10
    Hecho cuando: `logic/resetToken.ts` implementa `isValidResetToken(token: string): boolean` con regex `/^[a-f0-9]{64}$/`; los tests verifican token válido (64 hex), inválido (63, 65, no hex, vacío); y `npm run check` en verde.

## Fase 5 — Frontend: UI (depende de 10, 11)

- [x] **12. `LoginPage.tsx`: enlace y mensaje de éxito**
    RF: RF-10, RF-11
    Hecho cuando: `LoginPage.tsx` añade un enlace "¿Olvidaste tu contraseña?" (`to="/recuperar-clave"`, `aria-label="Recuperar contraseña"`) debajo del botón "Iniciar sesión"; lee `location.state?.notice === "password-reset-success"` al montar y muestra "Contraseña restablecida con éxito. Ya puedes iniciar sesión." en `role="status"` si existe, limpiando el state con `replace`; los tests actualizados verifican el enlace y el mensaje; y `npm run check` en verde.

- [x] **13. Página `ForgotPasswordPage.tsx`**
    RF: RF-9
    Hecho cuando: `pages/ForgotPasswordPage.tsx` renderiza formulario con `TextField` "Correo electrónico" (`type="email"`, `autoComplete="email"`, `label`), botón "Enviar enlace de restablecimiento" y enlace "Volver al inicio de sesión"; maneja estados idle/loading/success/error; validación con `emailField`; al enviar: "Enviando…" + `aria-busy`; éxito: mensaje genérico en `role="status"`; error 429: mensaje de rate limit en `role="alert"` conservando email; error 500/red: mensaje de error en `role="alert"` con botón "Reintentar"; los tests con `fetch` simulado verifico render, validación, éxito, errores y reintentar; y `npm run check` en verde.

- [x] **14. Página `ResetPasswordPage.tsx`**
    RF: RF-10
    Hecho cuando: `pages/ResetPasswordPage.tsx` lee `:token` de `useParams`, valida con `isValidResetToken`, hace GET `/validate-reset-token/:token` al montar; estados validating/valid/invalid/loading/success/error; inválido: mensaje en `role="alert"` + enlace "Solicitar otro enlace"; válido: formulario con "Nueva contraseña" y "Confirmar contraseña" (`type="password"`, `autoComplete="new-password"`); validación de password + coincidencia; al enviar: "Restableciendo…" + `aria-busy`; éxito: navega a `/iniciar-sesion` con `state: { notice: "password-reset-success" }`; error 400: mensaje + enlace "Solicitar otro enlace"; error red: mensaje + botón "Reintentar"; los tests con `fetch` simulado verifico validación, éxito, errores y navegación; y `npm run check` en verde.

- [x] **15. Rutas en `App.tsx`**
    RF: RF-9, RF-10
    Hecho cuando: `App.tsx` suma dos rutas públicas (fuera de guards): `<Route path="/recuperar-clave" element={<ForgotPasswordPage />} />` y `<Route path="/resetear-clave/:token" element={<ResetPasswordPage />} />`; y `npm run check` en verde.

## Fase 6 — Verificación y cierre (depende de todo)

- [x] **16. Verificación QA según criterios de finalización y accesibilidad**
    RF: RF-1…RF-11, RNF-1…RNF-9
    Hecho cuando: verifico manualmente el flujo completo: enlace en login → `/recuperar-clave` → enviar email → correo recibido (o `devToken` en consola) → enlace → `/resetear-clave/:token` → nueva contraseña → `/iniciar-sesion` con mensaje de éxito; token expirado (15 min) muestra error; token ya usado muestra error; rate limit (4ª solicitud → 429); email no existe muestra mismo mensaje que si existe; desde móvil (360 px) sin scroll horizontal; todo por teclado; consola limpia.

- [x] **17. Cierre: `npm run check` en verde**
    RF: RNF-9, criterio de finalización 13
    Hecho cuando: `npm run check` de raíz (`tsc --noEmit` + Vitest de los tres workspaces) pasa sin errores y anoto el resultado en la respuesta final.
