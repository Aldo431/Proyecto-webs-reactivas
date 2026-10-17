import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPasswordInputSchema } from "@tiendadcc/utils";
import { Header } from "../components/Header.tsx";
import { TextField } from "../components/TextField.tsx";
import { Button } from "../components/ui/button.tsx";
import { issuesToFieldErrors } from "../logic/formErrors.ts";
import { resetPassword, validateResetToken } from "../logic/authApi.ts";
import { isValidResetToken } from "../logic/resetToken.ts";

type PageStatus =
  | "validating"
  | "valid"
  | "invalid"
  | "validation-error"
  | "submitting"
  | "submit-error";

interface PasswordValues {
  password: string;
  passwordConfirm: string;
}

const FIELD_ORDER = ["password", "passwordConfirm"] as const;

export function ResetPasswordPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PageStatus>("validating");
  const [values, setValues] = useState<PasswordValues>({
    password: "",
    passwordConfirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);

  async function checkToken(): Promise<void> {
    if (!isValidResetToken(token)) {
      setStatus("invalid");
      return;
    }
    setStatus("validating");
    const result = await validateResetToken(token);
    if (!result.ok) {
      setFormError(result.message);
      setStatus("validation-error");
    } else {
      setStatus(result.valid ? "valid" : "invalid");
    }
  }

  useEffect(() => {
    let current = true;
    if (!isValidResetToken(token)) {
      setStatus("invalid");
      return () => {
        current = false;
      };
    }
    setStatus("validating");
    void validateResetToken(token).then((result) => {
      if (!current) return;
      if (!result.ok) {
        setFormError(result.message);
        setStatus("validation-error");
      } else {
        setStatus(result.valid ? "valid" : "invalid");
      }
    });
    return () => {
      current = false;
    };
  }, [token]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => {
      if (previous[name] === undefined) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
    setFormError(null);
  }

  function focusFirstError(errors: Record<string, string>): void {
    for (const name of FIELD_ORDER) {
      if (errors[name] !== undefined) {
        (name === "password" ? passwordRef : passwordConfirmRef).current?.focus();
        return;
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const parsed = resetPasswordInputSchema.safeParse({
      token,
      password: values.password,
    });
    if (!parsed.success) {
      const errors = issuesToFieldErrors(parsed.error);
      setFieldErrors(errors);
      setFormError(null);
      focusFirstError(errors);
      return;
    }
    if (values.password !== values.passwordConfirm) {
      const errors = { passwordConfirm: "Las contraseñas no coinciden." };
      setFieldErrors(errors);
      setFormError(null);
      focusFirstError(errors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setStatus("submitting");
    const result = await resetPassword(token, parsed.data.password);
    if (result.ok) {
      navigate("/iniciar-sesion", {
        state: { notice: "password-reset-success" },
      });
      return;
    }
    if (result.message === "El enlace de restablecimiento es inválido o ha expirado.") {
      setStatus("invalid");
      return;
    }
    if (result.fieldErrors !== undefined) {
      setFieldErrors(result.fieldErrors);
      focusFirstError(result.fieldErrors);
    }
    setFormError(result.message);
    setStatus("submit-error");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-14">
        <h1 className="mb-3 font-mono text-3xl font-bold text-foreground">
          Restablecer contraseña
        </h1>
        {status === "validating" ? (
          <p role="status" aria-busy="true" className="text-sm text-muted-foreground">
            Verificando enlace…
          </p>
        ) : status === "invalid" ? (
          <section className="space-y-5 rounded-xl border border-border bg-card p-6">
            <p role="alert" className="text-sm leading-6 text-destructive">
              El enlace de restablecimiento es inválido o ha expirado.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link to="/recuperar-clave">Solicitar otro enlace</Link>
            </Button>
            <p className="text-center text-sm">
              <Link className="text-primary underline-offset-4 hover:underline" to="/iniciar-sesion">
                Volver al inicio de sesión
              </Link>
            </p>
          </section>
        ) : status === "validation-error" ? (
          <section className="space-y-5 rounded-xl border border-border bg-card p-6">
            <p role="alert" className="text-sm text-destructive">
              {formError ?? "No se pudo verificar el enlace. Intenta más tarde."}
            </p>
            <Button type="button" className="w-full" size="lg" onClick={() => void checkToken()}>
              Reintentar
            </Button>
            <Link className="block text-center text-sm text-primary underline-offset-4 hover:underline" to="/recuperar-clave">
              Solicitar otro enlace
            </Link>
          </section>
        ) : (
          <form
            className="space-y-5 rounded-xl border border-border bg-card p-6"
            noValidate
            onSubmit={handleSubmit}
          >
            <TextField
              label="Nueva contraseña"
              name="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange}
              disabled={status === "submitting"}
              error={fieldErrors.password}
              inputRef={passwordRef}
            />
            <TextField
              label="Confirmar contraseña"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              value={values.passwordConfirm}
              onChange={handleChange}
              disabled={status === "submitting"}
              error={fieldErrors.passwordConfirm}
              inputRef={passwordConfirmRef}
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
              disabled={status === "submitting"}
              aria-busy={status === "submitting"}
            >
              {status === "submitting"
                ? "Restableciendo…"
                : status === "submit-error"
                  ? "Reintentar"
                  : "Restablecer contraseña"}
            </Button>
            <p className="text-center text-sm">
              <Link className="text-primary underline-offset-4 hover:underline" to="/iniciar-sesion">
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
