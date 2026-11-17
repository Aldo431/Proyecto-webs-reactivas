import { CircleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button.tsx";

interface AdminErrorStateProps {
  message: string;
  httpStatus: number | null;
  onRetry: () => void;
}

// Error de carga de una sección (spec 013, RF-10). El error va en ámbar con
// ícono y texto (nunca solo color). Una cuenta degradada con el panel abierto
// recibe 403: además de reintentar, se le ofrece volver a la tienda.
export function AdminErrorState({
  message,
  httpStatus,
  onRetry,
}: AdminErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-destructive bg-card p-4"
    >
      <p className="flex items-start gap-2 text-destructive">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
        {httpStatus === 403 && (
          <Button asChild variant="link" size="sm">
            <Link to="/">Volver a la tienda</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
