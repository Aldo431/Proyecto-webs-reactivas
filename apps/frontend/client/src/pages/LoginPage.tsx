import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { loginInputSchema } from "@tiendadcc/utils";
import { Header } from "../components/Header.tsx";
import { TextField } from "../components/TextField.tsx";
import { Button } from "../components/ui/button.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { issuesToFieldErrors } from "../logic/formErrors.ts";

const FIELD_ORDER = ["email", "password"] as const;

interface LoginValues {
  email: string;
  password: string;
}

const EMPTY_VALUES: LoginValues = { email: "", password: "" };

// Functional login form (RF-2, RF-7, RF-12): validates with the shared Zod
// schema, shows per-field and general errors in Spanish without losing the
// entered data, disables the button while submitting and, on success,
// reflects the session and navigates home.
export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [values, setValues] = useState<LoginValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  // Move focus to the error region when only a general message is shown (RF-7).
  useEffect(() => {
    if (formError !== null && Object.keys(fieldErrors).length === 0) {
      formErrorRef.current?.focus();
    }
  }, [formError, fieldErrors]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => {
      if (previous[name] === undefined) {
        return previous;
      }
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  function focusFirstError(
    form: HTMLFormElement,
    errors: Record<string, string>,
  ) {
    for (const name of FIELD_ORDER) {
      if (errors[name] !== undefined) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) {
          field.focus();
        }
        return;
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const form = event.currentTarget;
    const parsed = loginInputSchema.safeParse(values);
    if (!parsed.success) {
      const errors = issuesToFieldErrors(parsed.error);
      setFieldErrors(errors);
      setFormError(null);
      focusFirstError(form, errors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    const result = await login(parsed.data);
    setSubmitting(false);

    if (result.ok) {
      navigate("/");
      return;
    }
    if (result.fieldErrors !== undefined) {
      setFieldErrors(result.fieldErrors);
      setFormError(result.message);
      focusFirstError(form, result.fieldErrors);
      return;
    }
    setFormError(result.message);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-14">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
          Iniciar sesión
        </h1>
        <form
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
          noValidate
          onSubmit={handleSubmit}
        >
          <TextField
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            disabled={submitting}
            error={fieldErrors.email}
          />
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            disabled={submitting}
            error={fieldErrors.password}
          />
          {formError !== null && (
            <p
              ref={formErrorRef}
              role="alert"
              tabIndex={-1}
              className="text-sm text-destructive outline-none"
            >
              {formError}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
            aria-busy={submitting}
          >
            Iniciar sesión
          </Button>
        </form>
      </main>
    </div>
  );
}
