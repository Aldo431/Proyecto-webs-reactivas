import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils.ts";
import { Badge } from "./ui/badge.tsx";

interface ComingSoonItemProps {
  label: string;
  icon?: LucideIcon;
  // Below the `sm` breakpoint, show only the icon and an abbreviated mark
  // (Home RNF-3). The accessible name keeps the full label either way.
  compactOnMobile?: boolean;
  className?: string;
}

// An access that exists but is not available yet (Home RF-1, RF-9). It is a
// focusable button with aria-disabled, not `disabled`, so keyboard users can
// still reach it and hear its state (plan D10). Activating it does nothing.
export function ComingSoonItem({
  label,
  icon: Icon,
  compactOnMobile = false,
  className,
}: ComingSoonItemProps) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label} (próximamente)`}
      className={cn(
        "inline-flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compactOnMobile && "max-sm:gap-1 max-sm:px-1",
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-4" />}
      <span className={cn(compactOnMobile && "hidden sm:inline")}>{label}</span>
      <Badge
        variant="outline"
        className={cn(
          "font-mono text-muted-foreground",
          compactOnMobile && "max-sm:px-1.5",
        )}
      >
        {compactOnMobile ? (
          <>
            <span className="sm:hidden">próx.</span>
            <span className="hidden sm:inline">próximamente</span>
          </>
        ) : (
          "próximamente"
        )}
      </Badge>
    </button>
  );
}
