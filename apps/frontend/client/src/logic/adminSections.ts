export interface AdminSection {
  path: string;
  label: string;
  description: string;
}

export const ADMIN_BASE_PATH = "/admin";

// Single source for the admin navigation and the page titles (012 RF-7).
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    path: "/admin",
    label: "Resumen",
    description: "Vista general de la tienda.",
  },
  {
    path: "/admin/productos",
    label: "Productos",
    description: "Gestiona los productos publicados y los destacados.",
  },
  {
    path: "/admin/usuarios",
    label: "Usuarios",
    description: "Revisa las cuentas registradas y sus roles.",
  },
  {
    path: "/admin/resenas",
    label: "Reseñas",
    description: "Modera las reseñas de los productos.",
  },
];

export function getAdminSection(path: string): AdminSection {
  const section = ADMIN_SECTIONS.find((candidate) => candidate.path === path);
  if (!section) {
    throw new Error(`Sección de administración desconocida: ${path}`);
  }
  return section;
}

function trimTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

// The overview only matches exactly; the other sections also match their
// subpaths (e.g. /admin/productos/abc).
export function isActiveSection(
  sectionPath: string,
  pathname: string,
): boolean {
  const current = trimTrailingSlash(pathname);
  if (sectionPath === ADMIN_BASE_PATH) {
    return current === ADMIN_BASE_PATH;
  }
  return current === sectionPath || current.startsWith(`${sectionPath}/`);
}
