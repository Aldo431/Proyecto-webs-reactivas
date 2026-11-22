import { useState, type FormEvent } from "react";
import {
  confirmMfaEnable,
  disableMfa,
  requestMfaDisable,
  requestMfaEnable,
} from "../logic/mfaApi.ts";
import { mfaStatusLabel } from "../logic/mfaFormat.ts";
import { useAuth } from "../stores/authStore.ts";
import { TextField } from "./TextField.tsx";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.tsx";

type Mode = "idle" | "enable" | "disable";

export function MfaSettings() {
  const { state: authState, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>("idle");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (authState.status !== "authenticated") return null;

  const enabled = authState.user.mfaEnabled;

  function resetForm(): void {
    setMode("idle");
    setChallengeId(null);
    setCode("");
    setPassword("");
    setDevCode(null);
  }

  async function handleRequest(nextMode: "enable" | "disable"): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    setDevCode(null);
    const result =
      nextMode === "enable" ? await requestMfaEnable() : await requestMfaDisable();
    if (result.ok) {
      setMode(nextMode);
      setChallengeId(result.challengeId);
      setDevCode(result.devCode ?? null);
      setMessage(result.message);
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy || challengeId === null) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result =
      mode === "enable"
        ? await confirmMfaEnable(challengeId, code)
        : await disableMfa(challengeId, code, password);
    if (result.ok) {
      setMessage(result.message);
      resetForm();
      await refresh();
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  return (
    <Card aria-labelledby="mfa-settings-title">
      <CardHeader>
        <CardTitle id="mfa-settings-title" className="font-mono">
          Verificación en dos pasos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-sm text-muted-foreground">Estado:</span>
          <Badge variant={enabled ? "default" : "secondary"}>
            {mfaStatusLabel(enabled)}
          </Badge>
        </div>

        {mode === "idle" && (
          <Button
            type="button"
            variant={enabled ? "outline" : "default"}
            className="self-start"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void handleRequest(enabled ? "disable" : "enable")}
          >
            {enabled
              ? "Desactivar verificación en dos pasos"
              : "Activar verificación en dos pasos"}
          </Button>
        )}

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

        {mode !== "idle" && (
          <form
            className="flex flex-col gap-4"
            aria-busy={busy}
            onSubmit={handleConfirm}
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
            {mode === "disable" && (
              <TextField
                label="Contraseña actual"
                name="mfaPassword"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy} aria-busy={busy}>
                {mode === "enable" ? "Confirmar activación" : "Confirmar desactivación"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={resetForm}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {error !== null && mode === "idle" && (
          <p role="alert" className="font-sans text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
