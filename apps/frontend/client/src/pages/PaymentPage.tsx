import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Navigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Header } from "../components/Header.tsx";
import { OrderSummary } from "../components/OrderSummary.tsx";
import { PaymentSuccess } from "../components/PaymentSuccess.tsx";
import { TextField } from "../components/TextField.tsx";
import { Button } from "../components/ui/button.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import {
  detectCardBrand,
  formatCardNumber,
  isCompleteCardNumber,
  paymentFormSchema,
  type CardBrand,
  type PaymentFormValues,
} from "../logic/paymentFields.ts";
import { issuesToFieldErrors } from "../logic/formErrors.ts";

const FIELD_ORDER = [
  "email",
  "cardNumber",
  "expiry",
  "cvc",
  "holderName",
] as const;

const BRAND_LABELS: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  unknown: "Tarjeta",
};

const EMPTY_VALUES: PaymentFormValues = {
  email: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
  holderName: "",
};

// Página de pago mock (011). El resumen va arriba en solo lectura y el
// formulario abajo en vertical con vencimiento y CVC en una misma fila; el
// botón "Pagar" indica el monto a pagar. El pago no toca la red: al validar,
// se captura el total, se vacía el carrito y se muestra el éxito en la misma
// ruta. Los datos de tarjeta viven solo en estado local y se descartan al
// pagar. Vacío y sin éxito previo → redirección a #/catalogo.
export function PaymentPage() {
  const { state: authState } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const userEmail =
    authState.status === "authenticated" ? authState.user.email : "";
  const [values, setValues] = useState<PaymentFormValues>(() => ({
    ...EMPTY_VALUES,
    email: userEmail,
  }));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paidTotal, setPaidTotal] = useState<number | null>(null);

  const cardBrand = detectCardBrand(values.cardNumber);
  const cardComplete = isCompleteCardNumber(values.cardNumber);

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

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((previous) => {
      if (name === "cardNumber") {
        return { ...previous, cardNumber: formatCardNumber(value) };
      }
      if (name === "expiry") {
        const digits = value.replace(/\D/g, "").slice(0, 4);
        return {
          ...previous,
          expiry:
            digits.length > 2
              ? `${digits.slice(0, 2)}/${digits.slice(2)}`
              : digits,
        };
      }
      if (name === "cvc") {
        return { ...previous, cvc: value.replace(/\D/g, "").slice(0, 4) };
      }
      return { ...previous, [name]: value };
    });
    setFieldErrors((previous) => {
      if (previous[name] === undefined) {
        return previous;
      }
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = paymentFormSchema.safeParse(values);
    if (!parsed.success) {
      const errors = issuesToFieldErrors(parsed.error);
      setFieldErrors(errors);
      focusFirstError(form, errors);
      return;
    }
    // Pago mock: éxito siempre, sin red ni demora (011 RF-7). Se captura el
    // total antes de vaciar el carrito para mostrar el monto pagado.
    setPaidTotal(totalAmount);
    clearCart();
    setValues({ ...EMPTY_VALUES, email: userEmail });
    setFieldErrors({});
  }

  // Carrito vacío sin éxito previo → catálogo (011 RF-4). Con éxito visible
  // la redirección no aplica (011 RF-8).
  if (paidTotal === null && items.length === 0) {
    return <Navigate to="/catalogo" replace />;
  }

  if (paidTotal !== null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-14">
          <PaymentSuccess totalPaid={paidTotal} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <h1 className="font-mono text-3xl font-bold text-foreground">
          Pago
        </h1>
        <OrderSummary items={items} totalAmount={totalAmount} />
        <form
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
          noValidate
          aria-labelledby="payment-method-title"
          onSubmit={handleSubmit}
        >
          <h2
            id="payment-method-title"
            className="font-mono text-lg font-bold text-card-foreground"
          >
            Método de pago
          </h2>
          <TextField
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="cc-email"
            value={values.email}
            onChange={handleChange}
            error={fieldErrors.email}
          />
          <TextField
            label="Número de tarjeta"
            name="cardNumber"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            value={values.cardNumber}
            onChange={handleChange}
            error={fieldErrors.cardNumber}
            trailing={
              cardComplete ? (
                <span className="flex items-center">
                  <Check
                    aria-hidden="true"
                    className="h-5 w-5 text-terminal-success"
                  />
                  <span className="sr-only">Número de tarjeta completo</span>
                </span>
              ) : undefined
            }
          />
          {cardBrand !== "unknown" &&
            fieldErrors.cardNumber === undefined && (
              <p className="-mt-2 font-mono text-xs text-muted-foreground">
                {BRAND_LABELS[cardBrand]}
              </p>
            )}
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Vencimiento (MM/AA)"
              name="expiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={values.expiry}
              onChange={handleChange}
              error={fieldErrors.expiry}
            />
            <TextField
              label="CVC"
              name="cvc"
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={values.cvc}
              onChange={handleChange}
              error={fieldErrors.cvc}
            />
          </div>
          <TextField
            label="Nombre del titular"
            name="holderName"
            type="text"
            autoComplete="cc-name"
            value={values.holderName}
            onChange={handleChange}
            error={fieldErrors.holderName}
          />
          <Button type="submit" size="lg" className="w-full">
            Pagar {formatPriceCLP(totalAmount)}
          </Button>
        </form>
      </main>
    </div>
  );
}
