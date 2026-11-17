import {
  ArrowLeft,
  LayoutDashboard,
  MessageSquare,
  Package,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { ADMIN_SECTIONS, isActiveSection } from "../../logic/adminSections.ts";
import { cn } from "@/lib/utils";
import { SkipLink } from "../SkipLink.tsx";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/productos": Package,
  "/admin/usuarios": Users,
  "/admin/resenas": MessageSquare,
};

// Admin shell (012 RF-7): sidebar with brand, navigation and admin card next
// to the section outlet. Below `md` the sidebar becomes a row of tabs with its
// own horizontal scroll, and the footer and card are hidden (the brand still
// links back to the store).
export function AdminLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <SkipLink targetRef={mainRef} />
      <aside className="flex flex-col border-b border-border bg-card md:min-h-screen md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 md:py-5">
          <Link
            to="/"
            className="rounded-md font-mono text-lg font-bold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="mr-2 text-terminal-prompt">
              {">_"}
            </span>
            TiendaDCC
          </Link>
          <Badge variant="destructive" className="font-mono">
            admin
          </Badge>
        </div>
        <nav
          aria-label="Administración"
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-visible md:px-3 md:pb-0"
        >
          {ADMIN_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.path];
            const active = isActiveSection(section.path, pathname);
            return (
              <Link
                key={section.path}
                to={section.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring md:rounded-l-none md:border-b-0 md:border-l-2",
                  active &&
                    "border-primary bg-secondary text-secondary-foreground",
                )}
              >
                {Icon && <Icon aria-hidden="true" className="size-4" />}
                {section.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden flex-col gap-3 border-t border-border p-3 md:flex">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="justify-start"
          >
            <Link to="/">
              <ArrowLeft aria-hidden="true" />
              Volver a la tienda
            </Link>
          </Button>
          {user && (
            <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-bold text-primary-foreground"
              >
                {user.displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {user.displayName}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {`@${user.username} · administrador`}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
      <main
        ref={mainRef}
        tabIndex={-1}
        className="min-w-0 flex-1 p-4 outline-none md:p-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
