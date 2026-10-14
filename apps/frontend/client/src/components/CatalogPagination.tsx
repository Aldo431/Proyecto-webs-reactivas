import { Button } from "./ui/button.tsx";

interface CatalogPaginationProps {
  pagina: number;
  totalPaginas: number;
  onSelectPage: (pagina: number) => void;
}

type PageToken = number | "ellipsis";

function pageTokens(pagina: number, totalPaginas: number): PageToken[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, index) => index + 1);
  }
  const window = new Set<number>([1, 2, pagina - 1, pagina, pagina + 1, totalPaginas - 1, totalPaginas]);
  const pages = [...window]
    .filter((page) => page >= 1 && page <= totalPaginas)
    .sort((first, second) => first - second);
  const tokens: PageToken[] = [];
  let previous = 0;
  for (const page of pages) {
    if (page - previous > 1) {
      tokens.push("ellipsis");
    }
    tokens.push(page);
    previous = page;
  }
  return tokens;
}

export function CatalogPagination({
  pagina,
  totalPaginas,
  onSelectPage,
}: CatalogPaginationProps) {
  if (totalPaginas <= 1) {
    return null;
  }
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        type="button"
        disabled={pagina <= 1}
        onClick={() => onSelectPage(pagina - 1)}
      >
        Anterior
      </Button>
      {pageTokens(pagina, totalPaginas).map((token, index) =>
        token === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="px-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Button
            key={token}
            variant={token === pagina ? "default" : "outline"}
            size="sm"
            type="button"
            aria-current={token === pagina ? "page" : undefined}
            aria-label={`Página ${token}`}
            onClick={() => onSelectPage(token)}
          >
            {token}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        type="button"
        disabled={pagina >= totalPaginas}
        onClick={() => onSelectPage(pagina + 1)}
      >
        Siguiente
      </Button>
    </nav>
  );
}
