import { useId, type ChangeEventHandler } from "react";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";

interface TextFieldProps {
  label: string;
  name: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  error?: string | undefined;
  autoComplete?: string | undefined;
  disabled?: boolean | undefined;
  inputMode?: "numeric" | undefined;
}

// Controlled field with an accessible error (RF-12, RNF-4): the label is
// linked to the input, and when there is an error the input exposes
// `aria-invalid` plus `aria-describedby` pointing at the message, which lives
// in a `role="alert"` region so it is announced.
export function TextField({
  label,
  name,
  type,
  value,
  onChange,
  error,
  autoComplete,
  disabled,
  inputMode,
}: TextFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined && error !== "";

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        inputMode={inputMode}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={hasError ? errorId : undefined}
      />
      {hasError && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
