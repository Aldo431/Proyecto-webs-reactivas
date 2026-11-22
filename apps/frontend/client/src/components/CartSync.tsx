import type { ReactNode } from "react";
import { useCartSync } from "../logic/useCartSync.ts";

interface CartSyncProps {
  children?: ReactNode;
}

// Mantiene el store del carrito sincronizado con localStorage y con la cuenta
// (spec 015, RF-3). Se monta una sola vez; `children` es opcional solo para
// montar árboles en tests.
export function CartSync({ children }: CartSyncProps) {
  useCartSync();
  return <>{children}</>;
}
