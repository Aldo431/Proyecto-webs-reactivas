// Site footer (Home RF-9): project, DCC link, course and year. No email
// address by design. The "//" comment prefix is decorative and hidden from
// assistive technology.
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10">
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
      </div>
    </footer>
  );
}
