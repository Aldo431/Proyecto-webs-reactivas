# Plan 010 — Recuperación de contraseña

Plan de implementación para la spec `010-password-recovery`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-11. Cada sección indica qué RF atiende. Las specs 005 y 007 quedan congeladas: este plan solo toca lo que la 010 declara (nuevo o `modifica 00N/RF-x`).

## 1. Estructura de módulos
*Cubre: RF-1 … RF-11.*

Se trabaja sobre lo construido en 005–007: `@tiendadcc/utils` compartido, `User` con `passwordHash` y `email`, `requireAuth` + `errorHandler` (ZodError → 400), `authApi.ts` y `AuthContext`. La lógica vive en servicios del backend y en funciones/hooks puros del frontend, nunca en componentes (§3).

- **Esquemas compartidos** — `utils/src/authSchemas.ts` *(RF-5)*
  - `forgotPasswordInputSchema = z.object({ email: emailField })` donde `emailField` ya existe (validación Zod con mensajes en español).
  - `resetPasswordInputSchema = z.object({ token: z.string().min(1, "El token es obligatorio.").regex(/^[a-f0-9]{64}$/, "El token no es válido."), password: passwordField })` donde `passwordField` ya existe (8–100 caracteres).
  - `validateResetTokenResponseSchema = z.object({ valid: z.boolean() })` y su tipo `ValidateResetTokenResponse`.
  - Reexport desde `utils/src/index.ts` (ya incluye `authSchemas.ts`).

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1, RF-2, RF-3, RF-4, RF-6, RF-7)*
  - `models/User.ts`: suma `resetToken: { type: String, required: false, index: { unique: true, sparse: true, partialFilterExpression: { resetToken: { $ne: null } } } }` y `resetTokenExpiry: { type: Date, required: false }`. Ambos opcionales y por defecto `null`. Actualiza `UserFields` en la interfaz TypeScript *(RF-1)*.
  - `config/env.ts`: suma `SMTP_HOST` (string requerido), `SMTP_PORT` (coerción a entero, requerido), `SMTP_USER` (string requerido), `SMTP_PASS` (string requerido), `SMTP_FROM` (string requerido, validado con `z.email()`), todos con mensajes en español. Actualiza `Env` y `parseEnv`. En desarrollo (`NODE_ENV=development`), estas variables son opcionales (ver D1) *(RF-2)*.
  - `services/emailService.ts` (nuevo): crea un transporter de Nodemailer con `smtpTransport({ host, port, secure: port === 465, auth: { user, pass } })`. Expone `sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>` que envía un correo de texto plano con asunto "Restablecer tu contraseña" y cuerpo: "Haz clic en el enlace para restablecer tu contraseña: <resetUrl>\n\nEste enlace expira en 15 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este correo." *(RF-2)*.
  - `services/passwordResetService.ts` (nuevo): lógica pura testeable con dependencias inyectadas.
    - `generateResetToken(): string` usa `crypto.randomBytes(32).toString("hex")` (64 caracteres hex) *(RF-3, RF-6)*.
    - `createResetToken(email: string, deps: { findUser, saveUser, sendEmail, getResetUrl, now }): Promise<{ ok: true } | { ok: false, reason: "rate-limited" | "error" }>`:
      - Busca el usuario por email (case-insensitive, trim).
      - Si no existe, responde `{ ok: true }` sin enviar correo (anti-enumeración, RF-3).
      - Si existe, verifica rate limiting (ver D2): cuenta tokens creados en la última hora para ese email y para esa IP (si se pasa la IP). Si excede, responde `{ ok: false, reason: "rate-limited" }`.
      - Genera token con `generateResetToken()`, calcula `resetTokenExpiry = now() + 15 minutos`, guarda en el usuario.
      - Construye `resetUrl` con `getResetUrl(token)` (usa `CLIENT_ORIGIN` + `/resetear-clave/` + token).
      - Envía correo con `sendEmail(user.email, resetUrl)`. Si falla, responde `{ ok: false, reason: "error" }` (no guarda el token).
      - Si todo OK, responde `{ ok: true }` *(RF-3)*.
    - `validateResetToken(token: string, deps: { findUserByToken, now }): Promise<boolean>`: busca usuario con `resetToken === token` y `resetTokenExpiry > now()`. Retorna `true` si existe y no expiró, `false` en caso contrario *(RF-6)*.
    - `resetPassword(token: string, newPassword: string, deps: { findUserByToken, hashPassword, saveUser, now }): Promise<{ ok: true } | { ok: false, reason: "invalid-token" }>`:
      - Busca usuario con token válido (no expirado).
      - Si no existe o expiró, responde `{ ok: false, reason: "invalid-token" }`.
      - Hashea la nueva contraseña con `hashPassword` (ya existe en `authService.ts`, usa bcrypt).
      - Actualiza `passwordHash`, limpia `resetToken` y `resetTokenExpiry` (los pone a `null`).
      - Responde `{ ok: true }` *(RF-7)*.
  - `middleware/rateLimit.ts` (nuevo): usa `express-rate-limit` con almacenamiento en memoria (default).
    - `forgotPasswordRateLimit`: window 1 hora, max 5 solicitudes por IP, message en español "Has excedido el límite de solicitudes. Intenta más tarde.", standardHeaders true (incluye `Retry-After`), legacyHeaders false.
    - El rate limit por email se maneja en el servicio (cuenta tokens en la última hora en MongoDB, ver D2) *(RF-4)*.
  - `controllers/authController.ts`: suma tres nuevos controladores *(RF-3, RF-6, RF-7)*.
    - `forgotPassword`: valida body con `forgotPasswordInputSchema`, llama a `createResetToken`, responde `200` con `{ message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." }` tanto si existe como si no. Si el servicio retorna `rate-limited`, responde `429` con el mensaje de rate limit. Si retorna `error`, responde `500` con "No se pudo enviar el correo. Intenta más tarde."
    - `validateResetToken`: valida `:token` con regex `/^[a-f0-9]{64}$/` (si no, responde `200` con `{ valid: false }`), llama a `validateResetToken`, responde `200` con `{ valid: true }` o `{ valid: false }`.
    - `resetPassword`: valida body con `resetPasswordInputSchema`, llama a `resetPassword`. Si retorna `invalid-token`, responde `400` con "El enlace de restablecimiento es inválido o ha expirado." Si OK, responde `200` con `{ message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión." }` y limpia la cookie de sesión (llama a `clearSessionCookie` de `session.ts`) *(RF-7)*.
  - `routes/authRoutes.ts`: suma tres nuevas rutas *(RF-3, RF-6, RF-7)*.
    - `POST /forgot-password` con `forgotPasswordRateLimit` y `forgotPassword` controller.
    - `GET /validate-reset-token/:token` con `validateResetToken` controller.
    - `POST /reset-password` con `resetPassword` controller.

- **Lógica pura del frontend** — `src/logic/` *(RF-8, RF-10)*
  - `authApi.ts`: suma dos nuevas funciones al estilo de las existentes (`buildUrl`, `parseAuthResponse`) *(RF-8)*.
    - `forgotPassword(email: string): Promise<AuthFailure | { ok: true; message: string }>`: valida `email` con `emailField` de `@tiendadcc/utils` antes de enviar. Hace `POST /api/auth/forgot-password` con `{ email }`, `credentials: "include"`. Si `200`, retorna `{ ok: true, message: body.message }`. Si `400`/`429`/`500`, retorna `AuthFailure` con el mensaje del backend o "No se pudo enviar el correo. Intenta más tarde." si falla la red.
    - `resetPassword(token: string, password: string): Promise<AuthFailure | { ok: true; message: string }>`: valida `token` con regex `/^[a-f0-9]{64}$/` y `password` con `passwordField` de `@tiendadcc/utils` antes de enviar. Hace `POST /api/auth/reset-password` con `{ token, password }`, `credentials: "include"`. Si `200`, retorna `{ ok: true, message: body.message }`. Si `400`, retorna `AuthFailure` con el mensaje del backend. Si falla la red, retorna `AuthFailure` con "No se pudo restablecer la contraseña. Intenta más tarde.".
  - `resetToken.ts` (nuevo): `isValidResetToken(token: string): boolean` valida con regex `/^[a-f0-9]{64}$/`. Pura, testeable *(RF-10)*.

- **Presentación** — `src/pages/` y `src/components/` *(RF-9, RF-10, RF-11)*
  - `pages/LoginPage.tsx`: añade un enlace "¿Olvidaste tu contraseña?" debajo del botón "Iniciar sesión", con `to="/recuperar-clave"`, estilo de enlace secundario (texto `text-muted-foreground hover:text-foreground`), `aria-label="Recuperar contraseña"`. Modifica 005 *(RF-11)*.
  - `pages/ForgotPasswordPage.tsx` (nuevo): página pública (no requiere autenticación) con formulario de recuperación de contraseña *(RF-9)*.
    - Estado: `email`, `status: "idle" | "loading" | "success" | "error"`, `error`, `fieldErrors`.
    - Formulario con `TextField` para "Correo electrónico" (`type="email"`, `autoComplete="email"`, `label` asociado), botón "Enviar enlace de restablecimiento" (deshabilitado si `loading`).
    - Al enviar: valida con `emailField`, si falla muestra `fieldErrors` y enfoca el campo. Si OK, llama a `authApi.forgotPassword(email)`.
    - Si `loading`: botón muestra "Enviando…", `aria-busy={true}`, deshabilitado.
    - Si `success`: muestra mensaje "Si el correo existe, recibirás un enlace para restablecer tu contraseña." en `role="status"`, y enlace "Volver al inicio de sesión" (`to="/iniciar-sesion"`).
    - Si `error` (429): muestra "Has excedido el límite de solicitudes. Intenta más tarde." en `role="alert"`, conserva el email ingresado.
    - Si `error` (500 o red): muestra "No se pudo enviar el correo. Intenta más tarde." en `role="alert"`, con botón "Reintentar" que vuelve a intentar con el mismo email.
    - Enlace "Volver al inicio de sesión" siempre visible.
    - Accesibilidad: `label` asociado, `aria-invalid` y `aria-describedby` en campos con error, errores en `role="alert"`, éxito en `role="status"`, operable por teclado, contraste AA.
  - `pages/ResetPasswordPage.tsx` (nuevo): página pública con formulario para establecer nueva contraseña *(RF-10)*.
    - Lee `:token` de la URL con `useParams()`.
    - Estado: `token`, `password`, `passwordConfirm`, `status: "validating" | "valid" | "invalid" | "loading" | "success" | "error"`, `error`, `fieldErrors`.
    - Al montar: valida `token` con `isValidResetToken`. Si inválido, `status = "invalid"`. Si válido, llama a `authApi.resetPassword` con un GET a `/validate-reset-token/:token` (o directamente intenta el POST y maneja el error, ver D3). Para simplificar, se valida al cargar con `GET /api/auth/validate-reset-token/:token`.
    - Si `validating`: muestra estado de carga "Verificando enlace…" con `aria-busy={true}`.
    - Si `invalid` (token inválido, expirado o ya usado): muestra "El enlace de restablecimiento es inválido o ha expirado." en `role="alert"`, con enlace "Solicitar otro enlace" (`to="/recuperar-clave"`).
    - Si `valid`: muestra formulario con `TextField` para "Nueva contraseña" (`type="password"`, `autoComplete="new-password"`), "Confirmar contraseña" (`type="password"`, `autoComplete="new-password"`), botón "Restablecer contraseña".
    - Al enviar: valida `password` con `passwordField`, verifica que `password === passwordConfirm` (si no, `fieldErrors.passwordConfirm = "Las contraseñas no coinciden."` y enfoca). Si OK, llama a `authApi.resetPassword(token, password)`.
    - Si `loading`: botón muestra "Restableciendo…", `aria-busy={true}`, deshabilitado.
    - Si `success`: navega a `/iniciar-sesion` con `state: { notice: "password-reset-success" }` (ver `publicationNotice.ts` como referencia).
    - Si `error` (400): muestra "El enlace de restablecimiento es inválido o ha expirado." en `role="alert"`, con enlace "Solicitar otro enlace".
    - Si `error` (red): muestra "No se pudo restablecer la contraseña. Intenta más tarde." en `role="alert"`, con botón "Reintentar".
    - Accesibilidad: `label` asociados, `aria-invalid` y `aria-describedby` en campos con error, errores en `role="alert"`, éxito en `role="status"` (al navegar), operable por teclado, contraste AA.
  - `pages/LoginPage.tsx`: lee `location.state?.notice === "password-reset-success"` al montar. Si existe, muestra "Contraseña restablecida con éxito. Ya puedes iniciar sesión." en `role="status"` encima del formulario, y limpia el `state` con `navigate(location.pathname, { replace: true, state: {} })` *(RF-10)*.
  - `App.tsx`: suma dos nuevas rutas públicas *(RF-9, RF-10)*.
    - `<Route path="/recuperar-clave" element={<ForgotPasswordPage />} />`
    - `<Route path="/resetear-clave/:token" element={<ResetPasswordPage />} />`
    - Ambas fuera de `OnlyAnonymousRoute` y `OnlyAuthenticatedRoute` (son públicas).

## 2. Modelo de datos
*Cubre: RF-1, RF-3, RF-6, RF-7.*

Documento `User` en MongoDB (solo se muestran los campos nuevos; el resto sin cambios):

```json
{
  "_id": "6713b0c2a1f4e9d2c8b70a11",
  "username": "anaperez",
  "displayName": "Ana Pérez",
  "email": "ana@example.com",
  "passwordHash": "$2b$10$...",
  "resetToken": "a1b2c3d4e5f6...64 caracteres hex...f6e5d4c3b2a1",
  "resetTokenExpiry": "2026-10-17T15:30:00.000Z",
  "createdAt": "2026-10-17T15:00:00.000Z",
  "updatedAt": "2026-10-17T15:00:00.000Z"
}
```

(El `resetToken` es un string de 64 caracteres hex (32 bytes aleatorios). `resetTokenExpiry` es una fecha ISO. Ambos son `null` cuando no hay un token activo. El índice único parcial asegura que no haya dos usuarios con el mismo `resetToken` activo, pero permite múltiples usuarios con `resetToken: null`.)

Entradas validadas en el servidor:

```json
{ "email": "ana@example.com" }
```

```json
{ "token": "a1b2c3d4e5f6...64 caracteres hex...f6e5d4c3b2a1", "password": "nuevaClave123" }
```

(`POST /forgot-password` exige `email` válido. `POST /reset-password` exige `token` válido (hex de 64 caracteres) y `password` de 8–100 caracteres.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Variables SMTP opcionales en desarrollo, requeridas en producción.**
- Justificación: en desarrollo, los desarrolladores no siempre tienen credenciales SMTP reales. El bypass (imprimir token en consola) permite probar el flujo sin configuración adicional. En producción, las variables son requeridas para enviar correos reales *(RF-2, spec Duda abierta "Dev mode bypass")*.
- Alternativa descartada: **Variables siempre requeridas**. Obliga a todos los desarrolladores a configurar SMTP real o simulado (p. ej. Mailtrap), lo que ralentiza el desarrollo local. **Usar un servicio de email de prueba (p. ej. Ethereal)**. Requiere configuración adicional y no es necesario para el flujo de desarrollo.

**D2 — Rate limiting por IP en middleware, por email en el servicio.**
- Justificación: `express-rate-limit` con almacenamiento en memoria es eficiente para limitar por IP (RF-4). El rate limit por email requiere contar tokens en MongoDB (consulta a la BD), lo que no encaja en el middleware de Express. El servicio `passwordResetService.ts` ya tiene acceso a la BD y puede contar tokens creados en la última hora para un email específico *(RF-3, RF-4)*.
- Alternativa descartada: **Rate limit por email en middleware**. Requeriría almacenar un mapa `email → count` en memoria, que no se persiste entre reinicios del servidor y no escala a múltiples instancias. **Rate limit por IP en el servicio**. Menos eficiente, ya que el middleware es el lugar natural para limitar por IP.

**D3 — Validar token al cargar la página con GET, no solo al enviar el POST.**
- Justificación: si el usuario accede a `/resetear-clave/:token` con un token inválido o expirado, es mejor mostrar el error de inmediato (RF-10) que esperar a que envíe el formulario. Esto mejora la UX y evita que el usuario llene el formulario solo para descubrir que el token no sirve. El endpoint `GET /validate-reset-token/:token` es rápido (una consulta a MongoDB) y no requiere autenticación *(RF-6, RF-10)*.
- Alternativa descartada: **Validar solo al enviar el POST**. El usuario llenaría el formulario y recibiría el error solo al enviar, lo que es menos eficiente y más frustrante.

**D4 — Token de 64 caracteres hex (32 bytes aleatorios).**
- Justificación: 32 bytes de entropía son suficientes para prevenir ataques de fuerza bruta (2^256 posibilidades). Hex es URL-safe y simple de generar con `crypto.randomBytes`. El spec lo confirma (Duda abierta "Token format") *(RF-3, RF-6)*.
- Alternativa descartada: **Base64url (43 caracteres)**. Más corto, pero requiere manejar caracteres especiales (`+`, `/`, `=`) y no es significativamente más eficiente. **UUID v4 (36 caracteres)**. Menos entropía (122 bits vs 256 bits) y no es el estándar para tokens de seguridad.

**D5 — Invalidar todas las sesiones tras el reset (limpiar cookie de sesión).**
- Justificación: si el usuario restablece la contraseña, es probable que haya olvidado la contraseña en todos sus dispositivos. Limpiar la cookie de sesión en el navegador actual fuerza al usuario a iniciar sesión de nuevo con la nueva contraseña, lo que es más seguro. Las sesiones en otros dispositivos expirarán naturalmente (7 días, ver `TOKEN_EXPIRES_IN` en `authService.ts`). El spec lo confirma (Duda abierta "Session invalidation") *(RF-7)*.
- Alternativa descartada: **Invalidar todas las sesiones activas (p. ej. con una tabla de sesiones)**. Requeriría almacenar sesiones en MongoDB, lo que complica la arquitectura y no es necesario para el caso de uso actual. **No invalidar sesiones**. Menos seguro, ya que el usuario podría tener sesiones activas en dispositivos comprometidos.

**D6 — No revelar si el email existe (anti-enumeración).**
- Justificación: si el backend responde "Email no encontrado" o "Enlace enviado", un atacante podría enumerar emails válidos. Responder siempre "Si el correo existe, recibirás un enlace..." previene este ataque. El spec lo confirma (Duda abierta "Anti-enumeration") *(RF-3)*.
- Alternativa descartada: **Revelar si el email existe**. Mejora la UX (el usuario sabe si se equivocó de email), pero compromete la seguridad.

**D7 — Nodemailer para envío de correos SMTP.**
- Justificación: Nodemailer es el estándar de la industria para envío de correos en Node.js, es ligero, bien mantenido y soporta SMTP, SMTPS, y servicios como SendGrid, Mailgun, etc. El spec lo confirma (Duda abierta "Dependencies") *(RF-2)*.
- Alternativa descartada: **Usar la API de un servicio de email (p. ej. SendGrid, Mailgun)**. Requiere una dependencia adicional y no es necesario si ya se configura SMTP. **Implementar SMTP desde cero**. Innecesariamente complejo y propenso a errores.

**D8 — `express-rate-limit` para limitación de tasa por IP.**
- Justificación: `express-rate-limit` es la solución estándar para rate limiting en Express, es ligero, bien mantenido, soporta almacenamiento en memoria (default) y en Redis (para múltiples instancias), y expone headers estándar (`Retry-After`). El spec lo confirma (Duda abierta "Dependencies") *(RF-4)*.
- Alternativa descartada: **Implementar rate limiting manualmente con un mapa en memoria**. Reinventar la rueda, propenso a errores, y no soporta múltiples instancias sin Redis. **Usar un servicio externo (p. ej. Cloudflare Rate Limiting)**. Requiere configuración adicional y no es necesario para el caso de uso actual.

**D9 — Enlace de restablecimiento con `CLIENT_ORIGIN` + `/resetear-clave/` + token.**
- Justificación: `CLIENT_ORIGIN` ya está definido en el entorno (p. ej. `http://localhost:5173` en desarrollo, `https://tiendadcc.cl` en producción). Construir el enlace con esta variable asegura que funcione en ambos entornos sin configuración adicional. El spec lo confirma (Duda abierta "Reset link base URL") *(RF-3)*.
- Alternativa descartada: **Variable `SMTP_RESET_URL` separada**. Requiere una variable de entorno adicional innecesaria. **Hardcodear el dominio**. No funciona en desarrollo y requiere cambiar el código para desplegar.

**D10 — Correo de texto plano (no HTML).**
- Justificación: el correo de texto plano es simple, compatible con todos los clientes de email, y no requiere plantillas HTML. El spec lo confirma (Duda abierta "Email format") *(RF-2)*.
- Alternativa descartada: **Correo HTML con logo y estilos**. Mejora la UX, pero requiere plantillas HTML, pruebas en múltiples clientes de email, y no es necesario para el MVP.

**D11 — Reutilización de contraseña permitida.**
- Justificación: el usuario puede restablecer su contraseña con la misma contraseña anterior. Esto es simple y no requiere almacenar historial de contraseñas. El spec lo confirma (Duda abierta "Password reuse prevention") *(RF-7)*.
- Alternativa descartada: **Prevenir reutilización de la contraseña anterior**. Requiere almacenar historial de contraseñas (p. ej. últimas 5), lo que complica el modelo de datos y no es necesario para el caso de uso actual.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 13.*

- **Lógica pura obligatoria (§4):**
  - `utils/authSchemas.test.ts` (ampliación): `forgotPasswordInputSchema` acepta email válido, rechaza email inválido (sin `@`, sin dominio, vacío), mensajes en español. `resetPasswordInputSchema` acepta token hex de 64 caracteres + password válida (8–100 caracteres), rechaza token con caracteres no hex, token de 63 o 65 caracteres, password corta (< 8), password larga (> 100). *(Verifica RF-5)*
  - `passwordResetService.test.ts` (nuevo):
    - `generateResetToken()`: retorna string de 64 caracteres hex, dos llamadas retornan tokens distintos.
    - `createResetToken()`:
      - Usuario no existe: retorna `{ ok: true }` sin llamar a `sendEmail`.
      - Usuario existe, rate limit no excedido: genera token, guarda en usuario, llama a `sendEmail` con URL correcta, retorna `{ ok: true }`.
      - Usuario existe, rate limit excedido (3 tokens en la última hora): retorna `{ ok: false, reason: "rate-limited" }` sin generar token ni enviar correo.
      - `sendEmail` falla: retorna `{ ok: false, reason: "error" }` sin guardar token.
    - `validateResetToken()`:
      - Token válido y no expirado: retorna `true`.
      - Token no existe: retorna `false`.
      - Token expirado (expiry < now): retorna `false`.
    - `resetPassword()`:
      - Token válido: hashea nueva contraseña, actualiza `passwordHash`, limpia `resetToken` y `resetTokenExpiry`, retorna `{ ok: true }`.
      - Token no existe: retorna `{ ok: false, reason: "invalid-token" }` sin actualizar nada.
      - Token expirado: retorna `{ ok: false, reason: "invalid-token" }` sin actualizar nada.
    - Dependencias inyectadas: `findUser`, `saveUser`, `sendEmail`, `getResetUrl`, `now`, `findUserByToken`, `hashPassword`. *(Verifica RF-3, RF-4, RF-6, RF-7)*
  - `resetToken.test.ts` (nuevo): `isValidResetToken()`: retorna `true` para token hex de 64 caracteres, `false` para token de 63 o 65 caracteres, `false` para token con caracteres no hex (p. ej. "g"), `false` para string vacío. *(Verifica RF-10)*
  - `authApi.test.ts` (ampliación):
    - `forgotPassword()`: email válido → `POST /api/auth/forgot-password` con `{ email }`, `200` → `{ ok: true, message: ... }`, `429` → `AuthFailure` con mensaje de rate limit, `500` → `AuthFailure` con mensaje de error, red caída → `AuthFailure` con mensaje de red. Email inválido → no hace petición, retorna `AuthFailure` con error de validación.
    - `resetPassword()`: token válido + password válida → `POST /api/auth/reset-password` con `{ token, password }`, `200` → `{ ok: true, message: ... }`, `400` → `AuthFailure` con mensaje de token inválido, red caída → `AuthFailure` con mensaje de red. Token inválido → no hace petición, retorna `AuthFailure` con error de validación. Password inválida → no hace petición, retorna `AuthFailure` con error de validación.
    - Usa `fetch` simulado (como `productApi.test.ts`). *(Verifica RF-8)*
- **Backend (rutas con supertest + `mongodb-memory-server`, §4):**
  - `POST /api/auth/forgot-password`:
    - Email válido, usuario existe: `200` con mensaje genérico, token guardado en BD, correo enviado (mock de `sendEmail`).
    - Email válido, usuario no existe: `200` con el mismo mensaje genérico, sin token guardado, sin correo enviado.
    - Email inválido: `400` con `fieldErrors.email`.
    - Rate limit excedido (4ª solicitud en 1 hora para el mismo email): `429` con mensaje de rate limit.
    - Rate limit por IP excedido (6ª solicitud en 1 hora desde la misma IP): `429` con mensaje de rate limit.
    - `sendEmail` falla: `500` con mensaje de error.
    - *(Verifica RF-3, RF-4)*
  - `GET /api/auth/validate-reset-token/:token`:
    - Token válido y no expirado: `200` con `{ valid: true }`.
    - Token no existe: `200` con `{ valid: false }`.
    - Token expirado: `200` con `{ valid: false }`.
    - Token inválido (no hex de 64 caracteres): `200` con `{ valid: false }`.
    - *(Verifica RF-6)*
  - `POST /api/auth/reset-password`:
    - Token válido + password válida: `200` con mensaje de éxito, `passwordHash` actualizado, `resetToken` y `resetTokenExpiry` limpiados, cookie de sesión borrada.
    - Token no existe: `400` con mensaje de token inválido.
    - Token expirado: `400` con mensaje de token inválido.
    - Token válido + password inválida: `400` con `fieldErrors.password`.
    - Token inválido (no hex de 64 caracteres): `400` con mensaje de token inválido.
    - Tras restablecer, el token ya no es válido (reutilización): `400` con mensaje de token inválido.
    - *(Verifica RF-7)*
- **Presentación (smoke tests, §4):**
  - `LoginPage.test.tsx` (ampliación): renderiza enlace "¿Olvidaste tu contraseña?" con `to="/recuperar-clave"`. Si `location.state?.notice === "password-reset-success"`, muestra mensaje de éxito en `role="status"`. *(Verifica RF-11, RF-10)*
  - `ForgotPasswordPage.test.tsx` (nuevo):
    - Renderiza formulario con "Correo electrónico" y "Enviar enlace de restablecimiento".
    - Email inválido → muestra `fieldErrors.email` y enfoca el campo.
    - Email válido, `200` → muestra mensaje de éxito en `role="status"`, conserva el email.
    - Email válido, `429` → muestra mensaje de rate limit en `role="alert"`, conserva el email.
    - Email válido, `500` → muestra mensaje de error en `role="alert"`, con botón "Reintentar".
    - Email válido, red caída → muestra mensaje de error en `role="alert"`, con botón "Reintentar".
    - Enlace "Volver al inicio de sesión" siempre visible.
    - *(Verifica RF-9)*
  - `ResetPasswordPage.test.tsx` (nuevo):
    - Token inválido en URL → muestra mensaje de token inválido en `role="alert"`, con enlace "Solicitar otro enlace".
    - Token válido, GET `/validate-reset-token/:token` retorna `{ valid: true }` → muestra formulario con "Nueva contraseña" y "Confirmar contraseña".
    - Token válido, GET retorna `{ valid: false }` → muestra mensaje de token inválido.
    - Contraseñas no coinciden → muestra `fieldErrors.passwordConfirm` y enfoca el campo.
    - Password inválida (< 8 caracteres) → muestra `fieldErrors.password`.
    - Todo válido, POST `200` → navega a `/iniciar-sesion` con `state: { notice: "password-reset-success" }`.
    - Todo válido, POST `400` → muestra mensaje de token inválido, con enlace "Solicitar otro enlace".
    - Todo válido, red caída → muestra mensaje de error, con botón "Reintentar".
    - *(Verifica RF-10)*
- **Verificación de contrato por QA (manual):**
  - Solicitar restablecimiento con email válido → correo recibido (o token en consola en desarrollo), enlace funciona.
  - Enlace expira tras 15 minutos → muestra mensaje de error.
  - Enlace ya usado → muestra mensaje de error.
  - Rate limit: 4ª solicitud en 1 hora → `429`.
  - Email no existe → mismo mensaje que si existe (anti-enumeración).
  - Desde móvil (360 px): formularios accesibles, sin scroll horizontal, operable por teclado.
  - Enlace "¿Olvidaste tu contraseña?" en login → navega a `/recuperar-clave`.
  - Tras restablecer, login muestra mensaje de éxito.
- **Ausencia de red / mocking:** backend con `mongodb-memory-server` y mock de `sendEmail`; frontend con `fetch` simulado.
- **Comando de cierre:** `npm run check` de raíz (`tsc --noEmit` + Vitest en los tres workspaces) en verde.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `models/User.ts` (`resetToken`, `resetTokenExpiry`) | RF-1 |
| `config/env.ts` (variables SMTP) | RF-2 |
| `services/emailService.ts` (Nodemailer) | RF-2 |
| `services/passwordResetService.ts` (generateResetToken, createResetToken, validateResetToken, resetPassword) | RF-3, RF-4, RF-6, RF-7 |
| `middleware/rateLimit.ts` (forgotPasswordRateLimit) | RF-4 |
| `controllers/authController.ts` (forgotPassword, validateResetToken, resetPassword) | RF-3, RF-6, RF-7 |
| `routes/authRoutes.ts` (POST /forgot-password, GET /validate-reset-token/:token, POST /reset-password) | RF-3, RF-6, RF-7 |
| `utils/authSchemas.ts` (forgotPasswordInputSchema, resetPasswordInputSchema, validateResetTokenResponseSchema) | RF-5 |
| `logic/authApi.ts` (forgotPassword, resetPassword) | RF-8 |
| `logic/resetToken.ts` (isValidResetToken) | RF-10 |
| `pages/LoginPage.tsx` (enlace "¿Olvidaste tu contraseña?", mensaje de éxito) | RF-11, RF-10 |
| `pages/ForgotPasswordPage.tsx` | RF-9 |
| `pages/ResetPasswordPage.tsx` | RF-10 |
| `App.tsx` (rutas /recuperar-clave, /resetear-clave/:token) | RF-9, RF-10 |
| Tests de lógica pura, rutas y presentación | Verificación RF-1 a RF-11 (§4) |

---

*Nota:* La spec 010 resuelve todas las dudas abiertas: token de 15 minutos, rate limits (3/email/hora, 5/IP/hora), dependencias (nodemailer, express-rate-limit), anti-enumeración, invalidación de sesiones, token único (sobrescribe el anterior), correo de texto plano, variables SMTP separadas, forced login tras reset, dev mode bypass, reutilización de contraseña permitida, enlace con `CLIENT_ORIGIN`, token hex de 64 caracteres, mensaje de éxito en login, token reutilizado muestra error. El plan asume esos valores. El siguiente paso según el flujo es generar `specs/010-password-recovery/tasks.md`.
