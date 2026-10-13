import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { registerInputSchema } from "@tiendadcc/utils";
import { Header } from "../components/Header.tsx";
import { TextField } from "../components/TextField.tsx";
import { Button } from "../components/ui/button.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { issuesToFieldErrors } from "../logic/formErrors.ts";

const FIELD_ORDER = [
  "username",
  "displayName",
  "email",
  "password",
  "passwordConfirm",
] as const;

interface RegisterValues {
  username: string;
  displayName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

const EMPTY_VALUES: RegisterValues = {
  username: "",
  displayName: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

// Functional register form (RF-1, RF-3, RF-7, RF-12): validates with the
// shared Zod schema (including the password match) and prevents double
// submits; on success it starts the session and navigates home.
export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [values, setValues] = useState<RegisterValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

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
    const parsed = registerInputSchema.safeParse(values);
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
    const result = await register(parsed.data);
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
        <h1 className="mb-8 text-3xl font-bold text-foreground">Registro</h1>
        <form
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
          noValidate
          onSubmit={handleSubmit}
        >
          <TextField
            label="Nombre de usuario"
            name="username"
            type="text"
            autoComplete="username"
            value={values.username}
            onChange={handleChange}
            disabled={submitting}
            error={fieldErrors.username}
          />
          <TextField
            label="Nombre a mostrar"
            name="displayName"
            type="text"
            autoComplete="nickname"
            value={values.displayName}
            onChange={handleChange}
            disabled={submitting}
            error={fieldErrors.displayName}
          />
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
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            disabled={submitting}
            error={fieldErrors.password}
          />
          <TextField
            label="Confirmar contraseña"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            value={values.passwordConfirm}
            onChange={handleChange}
            disabled={submitting}
            error={fieldErrors.passwordConfirm}
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
            Registrarse
          </Button>
        </form>
      </main>
    </div>
  );
}
