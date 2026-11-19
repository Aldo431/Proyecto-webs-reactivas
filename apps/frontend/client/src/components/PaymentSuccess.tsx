import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { Button } from "./ui/button.tsx";

interface PaymentSuccessProps {
  totalPaid: number;
  folio: string;
}

// Pantalla de éxito del pago (011 RF-8, 012 RF-7): reemplaza al formulario en
// la misma ruta; muestra el mensaje, el monto pagado y el folio del pedido
// creado. Sin datos de tarjeta ni folio de boleta (no hay backend de
// pasarela).
export function PaymentSuccess({ totalPaid, folio }: PaymentSuccessProps) {
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
      <p className="font-sans text-sm text-muted-foreground">
        Tu pedido{" "}
        <span className="font-mono text-foreground">{folio}</span>{" "}
        quedó registrado.
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button asChild size="lg" className="mt-2 w-full" variant="outline">
          <Link to="/perfil">Ver mis pedidos</Link>
        </Button>
        <Button asChild size="lg" className="w-full">
          <Link to="/">Volver a la tienda</Link>
        </Button>
      </div>
    </section>
  );
}
