import { useState, type FormEvent } from "react";
import {
  STUDENT_EMAIL_REQUIREMENT,
  needsStudentHint,
} from "../logic/promotionFormat.ts";
import {
  confirmStudentCode,
  requestStudentCode,
} from "../logic/studentApi.ts";
import { TextField } from "./TextField.tsx";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";

interface StudentVerificationCardProps {
  email: string;
  studentVerified: boolean;
  onVerified: () => void | Promise<void>;
}

export function StudentVerificationCard({
  email,
  studentVerified,
  onVerified,
}: StudentVerificationCardProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const busy = requesting || confirming;
  const canVerify = needsStudentHint(email, studentVerified);

  async function handleRequest(): Promise<void> {
    setRequesting(true);
    setError(null);
    setMessage(null);
    const result = await requestStudentCode(email);
    if (result.ok) {
      setMessage(result.message);
    } else {
      setError(result.message);
    }
    setRequesting(false);
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setConfirming(true);
    setError(null);
    setMessage(null);
    const result = await confirmStudentCode(code);
    if (result.ok) {
      setMessage(result.message);
      setCode("");
      await onVerified();
    } else {
      setError(result.message);
    }
    setConfirming(false);
  }

  return (
    <section aria-labelledby="student-verification-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="student-verification-title"
          className="font-mono text-lg font-bold text-card-foreground"
        >
          Cuenta de alumno
        </h2>
        <Badge variant={studentVerified ? "default" : "secondary"}>
          {studentVerified ? "Alumno verificado" : "Sin verificar"}
        </Badge>
      </div>

      {!canVerify ? (
        <p className="font-sans text-sm text-muted-foreground">
          {studentVerified
            ? "Tu descuento de alumno está activo."
            : STUDENT_EMAIL_REQUIREMENT}
        </p>
      ) : (
        <>
          <p className="font-sans text-sm text-muted-foreground">
            Verifica {email} para acceder al 20% de descuento.
          </p>
          <Button
            type="button"
            onClick={() => void handleRequest()}
            disabled={busy}
            aria-busy={requesting}
            className="self-start"
          >
            Enviar código a mi correo
          </Button>

          {message !== null && (
            <p role="status" className="font-sans text-sm text-terminal-success">
              {message}
            </p>
          )}
          <form className="flex flex-col gap-4" aria-busy={confirming} onSubmit={handleConfirm}>
            <TextField
              label="Código de verificación"
              name="studentCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={busy}
              error={error ?? undefined}
            />
            <Button type="submit" disabled={busy} aria-busy={confirming}>
              Confirmar código
            </Button>
          </form>
        </>
      )}

      {error !== null && !canVerify && (
        <p role="alert" className="font-sans text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
