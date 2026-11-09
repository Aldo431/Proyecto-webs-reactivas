import { useId, type ChangeEventHandler, type ReactNode, type Ref } from "react";
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
  inputRef?: Ref<HTMLInputElement> | undefined;
  trailing?: ReactNode | undefined;
}

// Controlled field with an accessible error (RF-12, RNF-4): the label is
// linked to the input, and when there is an error the input exposes
// `aria-invalid` plus `aria-describedby` pointing at the message, which lives
// in a `role="alert"` region so it is announced.
// When `trailing` is set, the node renders inside a relative container at the
// right edge of the input (e.g. the green check of the card field) and the
// input reserves space for it.
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
  inputRef,
  trailing,
}: TextFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined && error !== "";

  const input = (
    <Input
      ref={inputRef}
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
      className={trailing !== undefined ? "pr-10" : undefined}
    />
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      {trailing !== undefined ? (
        <div className="relative">
          {input}
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            {trailing}
          </span>
        </div>
      ) : (
        input
      )}
      {hasError && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
