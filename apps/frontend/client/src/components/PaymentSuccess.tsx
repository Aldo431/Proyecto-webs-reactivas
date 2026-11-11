import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { Button } from "./ui/button.tsx";

interface PaymentSuccessProps {
  totalPaid: number;
}

// Pantalla de éxito del pago mock (011 RF-8): reemplaza al formulario en la
// misma ruta; muestra el mensaje, el monto pagado y el retorno a la tienda.
// Sin folio ni número de orden (no hay backend de órdenes).
export function PaymentSuccess({ totalPaid }: PaymentSuccessProps) {
  return (
    <section
      aria-labelledby="payment-success-title"
      className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center"
    >
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full border border-terminal-success text-terminal-success"
      >
        <Check className="h-8 w-8" />
      </span>
      <h1
        id="payment-success-title"
        className="font-mono text-2xl font-bold text-card-foreground"
      >
        ¡Compra realizada con éxito!
      </h1>
      <p className="font-sans text-muted-foreground">
        Tu compra por{" "}
        <span className="font-mono text-foreground">
          {formatPriceCLP(totalPaid)}
        </span>{" "}
        ha sido procesada.
      </p>
      <Button asChild size="lg" className="mt-2 w-full">
        <Link to="/">Volver a la tienda</Link>
      </Button>
    </section>
  );
}
