import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordInputSchema } from "@tiendadcc/utils";
import { Header } from "../components/Header.tsx";
import { TextField } from "../components/TextField.tsx";
import { Button } from "../components/ui/button.tsx";
import { issuesToFieldErrors } from "../logic/formErrors.ts";
import { forgotPassword } from "../logic/authApi.ts";

type FormStatus = "idle" | "loading" | "success" | "error";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    setFieldError(undefined);
    setFormError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    const parsed = forgotPasswordInputSchema.safeParse({ email });
    if (!parsed.success) {
      const errors = issuesToFieldErrors(parsed.error);
      setFieldError(errors.email);
      setFormError(null);
      emailRef.current?.focus();
      return;
    }

    setStatus("loading");
    setFieldError(undefined);
    setFormError(null);
    const result = await forgotPassword(parsed.data.email);
    if (result.ok) {
      setSuccessMessage(result.message);
      setStatus("success");
      return;
    }

    setFormError(result.message);
    setStatus("error");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-14">
        <h1 className="mb-3 font-mono text-3xl font-bold text-foreground">
          Recuperar contraseña
        </h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">
          Ingresa el correo asociado a tu cuenta. Si existe, te enviaremos un
          enlace para restablecer tu contraseña.
        </p>

        {status === "success" ? (
          <section
            className="space-y-5 rounded-xl border border-border bg-card p-6"
            aria-labelledby="recovery-success-title"
          >
            <h2 id="recovery-success-title" className="sr-only">
              Solicitud enviada
            </h2>
            <p role="status" className="text-sm leading-6 text-foreground">
              {successMessage}
            </p>
            <Button asChild className="w-full" size="lg">
              <Link to="/iniciar-sesion">Volver al inicio de sesión</Link>
            </Button>
          </section>
        ) : (
          <form
            className="space-y-5 rounded-xl border border-border bg-card p-6"
            noValidate
            onSubmit={submit}
          >
            <TextField
              label="Correo electrónico"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={handleChange}
              disabled={status === "loading"}
              error={fieldError}
              inputRef={emailRef}
            />
            {formError !== null && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={status === "loading"}
              aria-busy={status === "loading"}
            >
              {status === "loading"
                ? "Enviando…"
                : status === "error"
                  ? "Reintentar"
                  : "Enviar enlace de restablecimiento"}
            </Button>
            <p className="text-center text-sm">
              <Link
                className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                to="/iniciar-sesion"
              >
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
