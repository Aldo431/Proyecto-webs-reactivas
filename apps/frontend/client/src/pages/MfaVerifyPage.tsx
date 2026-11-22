import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { mfaCodeSchema } from "@tiendadcc/utils";
import { Header } from "../components/Header.tsx";
import { TextField } from "../components/TextField.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { resendMfaCode } from "../logic/mfaApi.ts";
import { returnPathFromState } from "../logic/returnPath.ts";
import { useAuth } from "../stores/authStore.ts";

interface MfaNavigationState {
  challengeId?: unknown;
  from?: unknown;
  devCode?: unknown;
}

export function MfaVerifyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyMfa } = useAuth();
  const navigationState = location.state as MfaNavigationState | null;
  const challengeId =
    typeof navigationState?.challengeId === "string" &&
    navigationState.challengeId.length > 0
      ? navigationState.challengeId
      : null;
  const returnTo = returnPathFromState(navigationState);
  const initialDevCode = mfaCodeSchema.safeParse(navigationState?.devCode);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(
    initialDevCode.success ? initialDevCode.data : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (challengeId === null) {
    return <Navigate to="/iniciar-sesion" replace />;
  }
  const activeChallengeId = challengeId;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const parsed = mfaCodeSchema.safeParse(code.trim());
    if (!parsed.success) {
      setError("El código debe tener 6 dígitos.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await verifyMfa(activeChallengeId, parsed.data);
    if (result.ok) {
      navigate(returnTo, { replace: true });
      return;
    }
    setError(result.message);
    setBusy(false);
  }

  async function handleResend(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await resendMfaCode(activeChallengeId);
    if (result.ok) {
      setMessage(result.message);
      setDevCode(result.devCode ?? null);
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-14">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Verificar código</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="font-sans text-sm text-muted-foreground">
              Ingresa el código de 6 dígitos enviado a tu correo.
            </p>
            {message !== null && (
              <p role="status" className="font-sans text-sm text-terminal-success">
                {message}
              </p>
            )}
            {devCode !== null && (
              <p className="font-mono text-sm text-muted-foreground">
                Código de desarrollo: {devCode}
              </p>
            )}
            <form
              className="flex flex-col gap-4"
              aria-busy={busy}
              onSubmit={handleSubmit}
            >
              <TextField
                label="Código de verificación"
                name="mfaCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={busy}
                error={error ?? undefined}
              />
              <Button type="submit" disabled={busy} aria-busy={busy}>
                Verificar código
              </Button>
            </form>
            <Button
              type="button"
              variant="link"
              className="self-start px-0"
              disabled={busy}
              onClick={() => void handleResend()}
            >
              Reenviar código
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
