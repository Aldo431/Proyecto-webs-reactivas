interface CategoryFilterProps {
  categories: string[];
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export function CategoryFilter({
  categories,
  activeCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const baseClassName =
    "rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filtrar por categoría"
    >
      <button
        type="button"
        aria-pressed={activeCategory === null}
        onClick={() => onSelectCategory(null)}
        className={
          activeCategory === null
            ? `${baseClassName} bg-brand-800 text-white`
            : `${baseClassName} border border-slate-300 bg-white text-brand-900 hover:border-brand-400`
        }
      >
        Todas
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={activeCategory === category}
          onClick={() => onSelectCategory(category)}
          className={
            activeCategory === category
              ? `${baseClassName} bg-brand-800 text-white`
              : `${baseClassName} border border-slate-300 bg-white text-brand-900 hover:border-brand-400`
          }
        >
          {category}
        </button>
      ))}
    </div>
  );
}
