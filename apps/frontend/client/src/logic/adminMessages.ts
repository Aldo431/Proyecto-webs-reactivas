import type { UserRole } from "@tiendadcc/utils";

// Textos de avisos y diálogos del panel (spec 013, RF-11 a RF-13), tal como
// los fija la spec. Viven aquí, fuera de los componentes (constitución §3).

export const PRODUCTS_EMPTY = "No hay productos que coincidan con los filtros.";
export const REVIEWS_EMPTY = "No hay reseñas con este filtro.";
export const USERS_EMPTY = "No hay usuarios que coincidan con los filtros.";

export const PRODUCT_DELETED_NOTICE = "Publicación eliminada.";
export const REVIEW_DELETED_NOTICE = "Reseña eliminada.";

export function featuredNotice(name: string, featured: boolean): string {
  return featured
    ? `«${name}» ahora aparece en Destacados del inicio.`
    : `«${name}» ya no está destacado.`;
}

export function deleteProductDescription(
  name: string,
  sellerUsername: string,
): string {
  return (
    `La publicación «${name}» es de @${sellerUsername}. Se quitará del ` +
    "catálogo, de los favoritos, de los historiales y de los carritos, y " +
    "también se borrarán sus reseñas. No se puede deshacer."
  );
}

export const DELETE_REVIEW_TITLE = "Eliminar reseña";

export function deleteReviewDescription(
  authorUsername: string,
  productName: string,
): string {
  return `Se borrará la reseña de @${authorUsername} sobre «${productName}». No se puede deshacer.`;
}

export interface RoleDialogTexts {
  title: string;
  description: string;
  confirmLabel: string;
}

// Diálogo de confirmación al dar (`admin`) o quitar (`user`) el rol.
export function roleDialogTexts(
  username: string,
  targetRole: UserRole,
): RoleDialogTexts {
  if (targetRole === "admin") {
    return {
      title: `¿Hacer administrador a @${username}?`,
      description:
        "Podrá destacar y eliminar cualquier producto, moderar reseñas y cambiar el rol de otros usuarios.",
      confirmLabel: "Hacer administrador",
    };
  }
  return {
    title: `¿Quitar el rol de administrador a @${username}?`,
    description: "Volverá a ser un usuario normal y dejará de ver este panel.",
    confirmLabel: "Quitar administrador",
  };
}

export function roleNotice(username: string, role: UserRole): string {
  return role === "admin"
    ? `@${username} ahora es administrador.`
    : `@${username} ahora es usuario.`;
}

// El rol al que pasaría una cuenta con el botón de la fila.
export function nextRole(current: UserRole): UserRole {
  return current === "admin" ? "user" : "admin";
}
