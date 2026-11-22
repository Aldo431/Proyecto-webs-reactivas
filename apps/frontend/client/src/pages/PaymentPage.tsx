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
import { useAuth } from "../stores/authStore.ts";
import { useCart } from "../stores/cartStore.ts";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { createOrder } from "../logic/orderApi.ts";
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

// Página de pago (011): resumen arriba solo lectura y formulario abajo en
// vertical. El pago crea el pedido en el servidor ANTES de vaciar el carrito
// (012 RF-2): si `POST /api/orders` falla, el error se muestra y el carrito y
// los valores del formulario se conservan (012 RF-6). Los datos de tarjeta
// viven solo en estado local y nunca tocan la red ni la base (012 RF-10).
// Vacío y sin éxito previo → redirección a #/catalogo.
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
  const [paidOrder, setPaidOrder] = useState<{
    total: number;
    folio: string;
  } | null>(null);
  const [paying, setPaying] = useState<boolean>(false);
  const [payError, setPayError] = useState<string | null>(null);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paying) {
      return;
    }
    const form = event.currentTarget;
    const parsed = paymentFormSchema.safeParse(values);
    if (!parsed.success) {
      const errors = issuesToFieldErrors(parsed.error);
      setFieldErrors(errors);
      focusFirstError(form, errors);
      return;
    }
    // Pago con pedido real (012 RF-2): el pedido se crea primero con los
    // items del carrito; el total y el folio mostrados salen del servidor.
    // Solo si el backend confirma (y con el botón deshabilitado y
    // `aria-busy` durante la espera) se vacía el carrito y se muestra el
    // éxito. Ante cualquier fallo: error anunciable, carrito y valores
    // intactos (012 RF-6).
    setPaying(true);
    setPayError(null);
    const result = await createOrder(items);
    if (!result.ok) {
      setPayError(result.message);
      setPaying(false);
      return;
    }
    setPaidOrder({ total: result.order.total, folio: result.order.folio });
    clearCart();
    setValues({ ...EMPTY_VALUES, email: userEmail });
    setFieldErrors({});
    setPaying(false);
  }

  // Carrito vacío sin éxito previo → catálogo (011 RF-4). Con éxito visible
  // la redirección no aplica (011 RF-8).
  if (paidOrder === null && items.length === 0) {
    return <Navigate to="/catalogo" replace />;
  }

  if (paidOrder !== null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-14">
          <PaymentSuccess
            totalPaid={paidOrder.total}
            folio={paidOrder.folio}
          />
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
          {payError !== null && (
            <p role="alert" className="text-sm text-destructive">
              {payError}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={paying}
            aria-busy={paying}
          >
            Pagar {formatPriceCLP(totalAmount)}
          </Button>
        </form>
      </main>
    </div>
  );
}
