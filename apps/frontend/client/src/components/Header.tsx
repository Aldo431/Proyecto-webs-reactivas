import { useNavigate } from "react-router-dom";

interface HeaderProps {
  showBackButton: boolean;
  backLabel?: string;
}

export function Header({ showBackButton, backLabel = "Volver" }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 border-b border-brand-700 bg-brand-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-lg font-bold tracking-tight text-white transition hover:text-brand-200"
        >
          TiendaDCC
        </button>
        {showBackButton && (
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded border border-white/40 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
          >
            {backLabel}
          </button>
        )}
      </div>
    </header>
  );
}