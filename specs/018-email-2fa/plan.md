# Plan 018 — Verificación en dos pasos por correo

Plan de implementación para la spec `018-email-2fa`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-5. Cada sección indica qué RF atiende. La spec 017 convive sin acoplamiento: ambos features comparten `emailService` y el reinicio E2E, pero no comparten desafíos ni campos de usuario.

## 1. Estructura de módulos
*Cubre: RF-1 … RF-5.*

Se apoya en `loginInputSchema`/`publicUserSchema` de `@tiendadcc/utils`, `authController`, `authService`, `session.ts`, `emailService`, `rateLimit.ts`, `requireAuth`, `errorHandler`, `authStore`, `authApi`, `LoginPage`, `App.tsx` y las primitivas de `ui/` (§3). Los desafíos y códigos se gestionan en el servidor; el cliente solo envía códigos y muestra resultados. Antes de tocar UI se aplica `specs/00-design-system/spec.md` (AGENTS.md).

- **Esquemas compartidos** — `utils/src/mfaSchemas.ts` (nuevo) *(RF-1, RF-2, RF-3, RF-4)*
  - Constantes `MFA_CODE_LENGTH = 6`, `MFA_LOGIN_TTL_MS = 5 * 60 * 1000`, `MFA_SETUP_TTL_MS = 10 * 60 * 1000`, `MFA_MAX_ATTEMPTS = 5`, `MFA_MAX_RESENDS = 3`.
  - `mfaPurposeSchema = z.enum(["login", "enable", "disable"])` y `mfaCodeSchema` (exactamente 6 dígitos, sin espacios) *(RF-1, RF-3, RF-4)*.
  - `mfaChallengeIdSchema` (cadena no vacía) y `mfaVerifyInputSchema = { challengeId, code }` *(RF-2, RF-3)*.
  - `mfaEnableConfirmSchema = { code }`, `mfaDisableInputSchema = { code, password }` y `mfaResendInputSchema = { challengeId }` *(RF-1, RF-4, RF-3)*.
  - `mfaRequiredSchema = { mfaRequired: z.literal(true), challengeId, message, devCode?: string }` y `loginResponseSchema = z.union([publicUserSchema, mfaRequiredSchema])` *(RF-2)*.
  - `mfaActionResponseSchema = { message, devCode? }` para enable/disable/reenvío *(RF-1, RF-3, RF-4)*.
  - Extensión de `publicUserSchema` con `mfaEnabled: z.boolean().default(false)` para retrocompatibilidad con respuestas antiguas *(RF-2, RF-5)*. Reexport desde `utils/src/index.ts`.

- **Lógica pura** — `utils/src/mfaCode.ts` (nuevo) *(RF-1, RF-3)*
  - `generateMfaCode()` usa `crypto.randomInt(0, 1_000_000)` y devuelve 6 dígitos con `padStart`.
  - `hashMfaCode(code)` devuelve SHA-256 en hexadecimal; `safeEqualMfaCode(a, b)` compara hashes de igual longitud con `timingSafeEqual` y devuelve `false` si no lo son. Sin estado, testeable (§4, RNF-3).

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1, RF-2, RF-3, RF-4)*
  - `models/MfaChallenge.ts` (nuevo): `user` (ObjectId ref `User`, indexado), `purpose`, `codeHash`, `expiresAt`, `attempts` (default 0), `usedAt` (nullable) y `timestamps`; índice `{ expiresAt: 1 }` con `expireAfterSeconds: 0` para limpieza automática. `toPublicChallenge` no expone `codeHash` (RNF-3).
  - `models/User.ts` (modificar): campo `mfaEnabled: boolean` (default `false`), expuesto en `toPublicJSON()` *(RF-2, RF-5)*.
  - `services/mfaService.ts` (nuevo): `createChallenge(userId, purpose, email)` genera y persiste el código hasheado con el TTL según propósito y devuelve `{ challengeId, devCode? }`; `verifyChallenge(challengeId, userId, code, purpose)` aplica 404/400 para desafío ajeno/inexistente/usado, 400 expirado, incrementa intentos, responde 429 a los 5 fallos, invalida en usos correctos; `resendChallenge(challengeId, userId, purpose)` respeta el tope de 3 reenvíos. Funciones con dependencias inyectables para tests, como `passwordResetService.ts` *(RF-1, RF-3)*.
  - `services/emailService.ts` (modificar): nuevo `sendMfaCodeEmail(to, code)` con el mismo patrón de bypass en desarrollo/test y SMTP en producción; asunto "Tu código de verificación" y texto en español *(RF-1, RNF-1)*.
  - `middleware/rateLimit.ts` (modificar): `mfaRateLimit` derivado de `emailRateLimit`, keyed por correo y por `challengeId`, con mensaje en español, más `resetMfaRateLimits` para tests *(RF-3)*.
  - `controllers/mfaController.ts` y `routes/mfaRoutes.ts` (nuevos): `POST /api/auth/mfa/enable`, `/confirm`, `/disable/request`, `/disable`, `/verify`, `/resend`, con `requireAuth` en las cuatro de gestión y sin sesión en `/verify` y `/resend` *(RF-1, RF-2, RF-3, RF-4)*.
  - `controllers/authController.ts` (modificar): `login` consulta `user.mfaEnabled`; si está activo crea desafío `login`, envía correo y responde `200` con `mfaRequiredSchema` **sin** llamar a `setSessionCookie`; si no, conserva el flujo actual. El mensaje de contraseña incorrecta no cambia *(RF-2, RNF-7)*.
  - `controllers/testingController.ts` (modificar): borrar también `MfaChallenge` en `POST /api/testing/reset` *(RNF-5)*.
  - `app.ts` (modificar): montar `mfaRoutes` bajo `/api/auth` —el router propio se registra antes de las rutas existentes para que `/mfa/...` no colisione— *(RF-1…RF-4)*.

- **Lógica pura del frontend** — `apps/frontend/client/src/logic/` *(RF-1…RF-5)*
  - `mfaApi.ts` (nuevo): `requestMfaEnable()`, `confirmMfaEnable(code)`, `requestMfaDisable()`, `disableMfa(code, password)`, `verifyMfaLogin(challengeId, code)` y `resendMfaCode(challengeId)`, todos con `credentials: "include"`, validación Zod de respuestas y resultados discriminados con mensajes en español *(RF-1…RF-4)*.
  - `authApi.ts` (modificar): `login` devuelve `LoginResult = AuthSuccess | MfaRequiredResult | AuthFailure`; detecta `mfaRequired: true` con `loginResponseSchema` y expone `devCode` recibido *(RF-2, RF-3)*.
  - `mfaFormat.ts` (nuevo, puro): `mfaStatusLabel(enabled)` y `mfaErrorFromStatus(status)` centralizan textos y fallback en español *(RF-5, RNF-1)*.
  - `authStore.ts` (modificar): `login` solo fija el estado `authenticated` cuando el resultado trae `user`; nueva acción `verifyMfa` que, tras verificar, guarda el usuario devuelto; `logout` y `refresh` siguen iguales. Sin tercer store (spec 015, RF-4) *(RF-2, RF-5)*.

- **Presentación** — `apps/frontend/client/src/pages/` y `components/` *(RF-1, RF-4, RF-5)*
  - `pages/MfaVerifyPage.tsx` (nuevo): lee `challengeId` de `location.state`, muestra campo de 6 dígitos, enlace "Reenviar código", errores accesibles con `role="alert"` y mensaje `devCode` solo si la respuesta lo trae; al acertar, usa `verifyMfa` y navega a `returnPathFromState(location.state)` o al inicio *(RF-2, RF-3, RF-5)*.
  - `components/MfaSettings.tsx` (nuevo): tarjeta del perfil con estado "Activada"/"Desactivada", botones "Activar verificación en dos pasos" y "Desactivar verificación en dos pasos", y formularios de código (y contraseña al desactivar), con el patrón de `TextField` y `Button` del design system *(RF-1, RF-4, RF-5)*.
  - `pages/LoginPage.tsx` (modificar): si `login` devuelve `mfaRequired`, navega a `/verificar-clave` con `{ challengeId, from: returnTo, devCode? }` en el estado sin guardar la contraseña *(RF-2, RF-5)*.
  - `pages/ProfilePage.tsx` (modificar): renderiza `<MfaSettings />` y toma `mfaEnabled` del usuario del store *(RF-1, RF-5)*.
  - `App.tsx` (modificar): nueva ruta `/verificar-clave` dentro de `OnlyAnonymousRoute`; si no hay `challengeId` en el estado, `MfaVerifyPage` redirige a `/iniciar-sesion` *(RF-5)*.
  - `components/OnlyAnonymousRoute.tsx` (sin cambios): al verificar correctamente el usuario pasa a `authenticated` y la guardia ya existente se encarga de las rutas protegidas *(RF-5, RNF-7)*.

## 2. Modelo de datos JSON
*Cubre: RF-1, RF-2, RF-3, RF-4.*

No hay JSON estático nuevo. Se agrega la colección `mfaChallenges` y un campo booleano en `User`; las respuestas se validan con Zod antes de usarse (AGENTS.md). Claves en inglés, textos de usuario en español (§6).

Respuesta intermedia del login con 2FA activa:

```json
{
  "mfaRequired": true,
  "challengeId": "68f1c2a9b3d4e5f60718293a",
  "message": "Enviamos un código de verificación a tu correo.",
  "devCode": "481523"
}
```

Respuesta pública del usuario (ampliada, retrocompatible):

```json
{
  "id": "68f1c2a9b3d4e5f60718293b",
  "username": "anaperez",
  "displayName": "Ana Pérez",
  "email": "ana@uchile.cl",
  "role": "user",
  "mfaEnabled": true
}
```

Documento interno del desafío (nunca se serializa):

```json
{
  "_id": "68f1c2a9b3d4e5f60718293a",
  "user": "68f1c2a9b3d4e5f60718293b",
  "purpose": "login",
  "codeHash": "<sha256 de 6 dígitos>",
  "expiresAt": "2026-11-22T12:05:00.000Z",
  "attempts": 0,
  "usedAt": null
}
```

(El `devCode` solo aparece fuera de producción, igual que el `devToken` de recuperación. El hash del código nunca se expone ni se escribe en logs — RNF-3.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Colección `MfaChallenge` con propósito en vez de campos en `User`.**
- Justificación: RF-1, RF-2 y RF-4 usan códigos para tres propósitos distintos que pueden coexistir; un documento por desafío permite expiración, intentos y un solo uso sin ensuciar `User`, y el índice TTL limpia los vencidos.
- Alternativa descartada: **Campos `mfaCodeHash`/`mfaCodeExpiry` en `User`**. Un solo espacio para todos los propósitos impide activar y desactivar en paralelo y mezcla datos de sesión con datos de perfil.

**D2 — Login responde `200` con `mfaRequired` en vez de `401`.**
- Justificación: RF-2 exige no entregar cookie pero sí dar un `challengeId`; las credenciales eran correctas, así que `401` sería engañoso y `failureFromStatus` de `authApi.ts` mostraría "Correo o contraseña incorrectos.".
- Alternativa descartada: **`401` con cuerpo especial**. Rompe el contrato de errores y obliga a distinguir casos dentro del manejador de fallos.

**D3 — `devCode` solo en development/test, reutilizando el patrón de recuperación.**
- Justificación: RNF-3 prohíbe filtrar códigos en producción y RNF-5 exige E2E repetible sin SMTP; `passwordResetService.ts` ya aplica el mismo criterio con `devToken`.
- Alternativa descartada: **Leer correos desde un servidor SMTP de pruebas**. Requiere servicios externos y más configuración adicional fuera de alcance.

**D4 — Hash SHA-256 + `timingSafeEqual` y un solo uso.**
- Justificación: RNF-3 exige no almacenar el código en claro ni compararlo de forma vulnerable; RF-3 exige que no se pueda reutilizar. `crypto` ya está en Node y no agrega dependencias (RNF-2).
- Alternativa descartada: **Guardar el código en texto plano y borrarlo tras usarlo**. Expone el código a lecturas de la base y no evita comparación por tiempo.

**D5 — `mfaRateLimit` separado del de recuperación.**
- Justificación: RF-3 limita 3 reenvíos por hora y 5 intentos; reutilizar `forgotPasswordRateLimit` mezclaría contadores de flujos distintos y permitiría evadir el tope cambiando de endpoint.
- Alternativa descartada: **Confiar solo en `attempts` del desafío**. No limita la creación de nuevos desafíos ni el abuso por correo.

**D6 — `publicUserSchema.mfaEnabled` con default `false`.**
- Justificación: RF-5 necesita mostrar el estado en el perfil y RF-2 lo devuelve tras verificar; el `default` mantiene compatibilidad con respuestas de tests/versiones anteriores que no traen el campo (RNF-7).
- Alternativa descartada: **Exigir el campo sin default**. Rompería los tests existentes de `authApi`, `authStore` y `usersRoutes` que construyen usuarios públicos con el contrato anterior.

**D7 — La ruta de verificación queda bajo `OnlyAnonymousRoute`.**
- Justificación: RF-2 no entrega sesión hasta verificar y RF-5 exige redirigir a login sin desafío; la guardia existente ya evita que un usuario autenticado vea el formulario.
- Alternativa descartada: **Ruta pública sin guardia**. Un usuario ya autenticado podría entrar a `#/verificar-clave` y ver un formulario sin sentido.

**D8 — El `challengeId` viaja en `location.state`, no en la URL.**
- Justificación: RF-5 pide back/forward sin recarga y RF-2 exige un identificador opaco; el estado de navigación evita exponerlo en el historial y en servidores.
- Alternativa descartada: **Query string `?challengeId=...`**. Queda en el historial y en referidores, y el challengeId podría quedar en logs del servidor al servir la página.

**D9 — Desactivación con contraseña + código.**
- Justificación: RF-4 exige asegurar que quien desactiva sigue teniendo acceso al correo y conoce la contraseña; un atacante con solo la sesión no podría desactivar la protección.
- Alternativa descartada: **Desactivar solo con la sesión actual**. Un atacante con una sesión robada podría desactivar la 2FA sin ningún segundo factor.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 7.*

- **Lógica pura obligatoria (§4):**
  - `utils/mfaCode.test.ts`: `generateMfaCode` siempre 6 dígitos y en rango; `hashMfaCode` estable y distinto por código; `safeEqualMfaCode` con iguales, distintos y longitudes diferentes. *(Verifica RF-1, RF-3, RNF-3)*
  - `utils/mfaSchemas.test.ts`: código de 6 dígitos válido; rechazo de 5/7 dígitos, letras y espacios; `mfaVerifyInputSchema`; `loginResponseSchema` acepta usuario con/sin `mfaEnabled` y respuesta `mfaRequired`; `devCode` ausente no rompe el parseo. *(Verifica RF-1, RF-2, RF-5)*
- **Backend (supertest + `mongodb-memory-server`):**
  - `routes/mfaRoutes.test.ts`: activación `202` con `devCode` en test y sin él en producción; confirmación correcta → `mfaEnabled: true`; `409` al activar dos veces; desactivación con contraseña y código → `false`; `401` contraseña errónea; `400` código inválido/expirado/usado; `429` tras 5 fallos y tras 3 reenvíos; `challengeId` ajeno → `400`. *(Verifica RF-1, RF-3, RF-4)*
  - `routes/authRoutes.test.ts` (ampliar): usuario sin 2FA → cookie y usuario como hoy; con 2FA → `mfaRequired` sin cookie (`Set-Cookie` ausente); verificación correcta → cookie y `mfaEnabled: true`; contraseña errónea → `401` con el mensaje existente. *(Verifica RF-2, RNF-7)*
  - `controllers/testingController`: el reset elimina `mfaChallenges` y responde `204`. *(Verifica RNF-5)*
- **Presentación (smoke tests):**
  - `logic/mfaApi.test.ts`: éxito y fallos `400`/`401`/`429` con mensajes en español, validación Zod de respuestas y `fetch` simulado. *(Verifica RF-1…RF-4)*
  - `logic/authApi.test.ts` (ampliar): `login` distingue `AuthSuccess` de `MfaRequiredResult` y conserva `devCode`. *(Verifica RF-2)*
  - `stores/authStore.test.tsx` (ampliar): `login` con `mfaRequired` no autentica; `verifyMfa` sí autentica; `resetAuthStore` sigue funcionando. *(Verifica RF-5)*
  - `pages/MfaVerifyPage.test.tsx` y `components/MfaSettings.test.tsx`: redirección sin `challengeId`, error accesible con `role="alert"`, reenvío, estado activado/desactivado y contraseña al desactivar. *(Verifica RF-1, RF-4, RF-5)*
  - `App.test.tsx`: `#/verificar-clave` con estado válido muestra la vista; sin estado redirige a login; back/forward entre login y verificación. *(Verifica RF-5)*
- **Verificación de contrato por QA (manual):** activar desde el perfil con el código mostrado por consola, cerrar sesión, hacer login con 2FA, reenviar, equivocarse 5 veces, desactivar con contraseña, recargar `#/verificar-clave`, 360 px y teclado.
- **Ausencia de red / mocking:** correo con bypass de `emailService` en test; rutas con `mongodb-memory-server`; frontend con `fetch` simulado.
- **Comando de cierre:** `npm run check` en verde; además `npm run e2e` con el nuevo `mfa.spec.ts`.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `mfaSchemas`, `mfaCode`, `MfaChallenge`, `mfaService`, `mfaRoutes`, `emailService.sendMfaCodeEmail` | RF-1 |
| `authController.login` condicional, `loginResponseSchema`, `authApi.login`, `authStore.login`, `MfaVerifyPage` | RF-2 |
| `verifyChallenge`, `resendChallenge`, `mfaRateLimit`, intentos/expiración/TTL | RF-3 |
| `mfaDisableInputSchema`, `/disable/request`, `/disable`, `MfaSettings` | RF-4 |
| `MfaVerifyPage`, `MfaSettings`, `ProfilePage`, `App.tsx`, `mfaFormat`, `OnlyAnonymousRoute` | RF-5 |
| Tests de esquemas, código, rutas, store, páginas y E2E | Verificación RF-1 a RF-5 (§4) |

---
*Nota:* La spec no deja dudas abiertas (mecanismo por correo, alcance opcional, `devCode` no productivo y compatibilidad del login sin 2FA quedaron resueltos). El plan asume los valores más conservadores (TTL 5/10 minutos, 5 intentos, 3 reenvíos, hash SHA-256) y no modifica specs existentes. El siguiente paso según el flujo es generar `specs/018-email-2fa/tasks.md`.
