import { navigate, ROUTE_HOME } from "../hooks/useHashRouter.ts";

interface HeaderProps {
  showBackButton: boolean;
}

export function Header({ showBackButton }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-brand-700 bg-brand-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(ROUTE_HOME)}
          className="text-lg font-bold tracking-tight text-white transition hover:text-brand-200"
        >
          TiendaDCC
        </button>
        {showBackButton && (
          <button
            type="button"
            onClick={() => navigate(ROUTE_HOME)}
            className="rounded border border-white/40 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
          >
            Volver
          </button>
        )}
      </div>
    </header>
  );
}