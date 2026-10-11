import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useCart } from "../context/CartContext.tsx";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { Button } from "./ui/button.tsx";
import { CartEmptyState } from "./CartEmptyState.tsx";
import { CartItemRow } from "./CartItemRow.tsx";

export function CartDrawer() {
  const { items, isOpen, totalAmount, closeCart, clearCart } = useCart();
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<Element | null>(null);
  const location = useLocation();

  useEffect(() => {
    closeCart();
    // Se cierra al navegar; solo depende de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement;
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        closeCart();
        return;
      }
      if (event.key !== "Tab" || panelRef.current === null) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (openerRef.current instanceof HTMLElement) {
        openerRef.current.focus();
      }
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
        onClick={closeCart}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[calc(100vw-2rem)] max-w-[420px] flex-col border-l border-border bg-card text-card-foreground outline-none transition-transform duration-(--duration-base) ease-(--ease-standard) motion-reduce:transition-none"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="cart-title" className="font-mono text-lg font-bold">
            Tu Carrito
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="Cerrar carrito"
            onClick={closeCart}
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        {items.length === 0 ? (
          <CartEmptyState onNavigate={closeCart} />
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4">
              {items.map((item) => (
                <CartItemRow key={item.productId} item={item} />
              ))}
            </ul>
            <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm text-muted-foreground">
                  Total
                </span>
                <span className="font-mono text-lg font-bold">
                  {formatPriceCLP(totalAmount)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  className="flex-1"
                  onClick={clearCart}
                >
                  Vaciar carrito
                </Button>
                <Button
                  variant="default"
                  type="button"
                  className="flex-1"
                  onClick={closeCart}
                >
                  Finalizar compra
                </Button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
