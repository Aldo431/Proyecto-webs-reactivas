import { ComingSoonItem } from "./ComingSoonItem.tsx";

const INFO_PAGES = [
  "Sobre la tienda",
  "Envíos y retiro",
  "Preguntas frecuentes",
  "Contacto",
] as const;

// Site footer (Home RF-9): project, DCC link, course and year, plus the
// informative pages marked "próximamente". No email address by design. The
// "//" comment prefixes are decorative and hidden from assistive technology.
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
        <div className="space-y-3">
          <p className="font-mono text-lg font-bold text-card-foreground">
            TiendaDCC
          </p>
          <p className="text-sm text-muted-foreground">
            <span aria-hidden="true" className="mr-1 font-mono">
              {"//"}
            </span>
            Proyecto del curso CC5003 — Aplicaciones Web Reactivas, 2026
          </p>
          <p className="text-sm">
            <a
              href="https://www.dcc.uchile.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Departamento de Ciencias de la Computación (DCC)
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </p>
        </div>
        <nav aria-label="Información">
          <p className="mb-2 font-mono text-sm text-muted-foreground">
            <span aria-hidden="true" className="mr-1">
              {"//"}
            </span>
            Información
          </p>
          <ul className="flex flex-col items-start gap-1">
            {INFO_PAGES.map((page) => (
              <li key={page}>
                <ComingSoonItem label={page} className="px-0" />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
