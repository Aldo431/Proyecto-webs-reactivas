import type { MouseEvent, RefObject } from "react";

interface SkipLinkProps {
  targetRef: RefObject<HTMLElement | null>;
}

// "Saltar al contenido" (Home RNF-4). It focuses the target by script instead
// of using an anchor, because with HashRouter a "#id" href would change the
// route (plan D11). The target needs tabIndex={-1} to accept focus.
export function SkipLink({ targetRef }: SkipLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    targetRef.current?.focus();
  }

  return (
    <a
      href="#"
      onClick={handleClick}
      className="sr-only rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground outline-none focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      Saltar al contenido
    </a>
  );
}
