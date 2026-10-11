import { Link } from "react-router-dom";
import {
  CATEGORY_SHORTCUTS,
  catalogPathForCategory,
  toCategorySlug,
} from "../logic/categoryParam.ts";

// "Categorías" section (Home RF-6): one link per category to the filtered
// catalog, styled as a command-line flag. The command fragment is decorative,
// so each link's accessible name is just the category name.
export function CategoryShortcuts() {
  return (
    <section
      aria-labelledby="categories-heading"
      className="mx-auto max-w-6xl px-4 py-14"
    >
      <h2
        id="categories-heading"
        className="mb-8 text-3xl font-bold text-foreground"
      >
        Categorías
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CATEGORY_SHORTCUTS.map((category) => (
          <li key={category}>
            <Link
              to={catalogPathForCategory(category)}
              className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 outline-none transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span
                aria-hidden="true"
                className="font-mono text-sm break-words text-muted-foreground"
              >
                <span className="text-terminal-prompt">$ </span>
                tiendadcc{" "}
                <span className="whitespace-nowrap">
                  --categoria={toCategorySlug(category)}
                </span>
              </span>
              <span className="font-mono text-xl font-semibold text-card-foreground">
                {category}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
