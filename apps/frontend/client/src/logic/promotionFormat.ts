import {
  STUDENT_DISCOUNT_PERCENT,
  isStudentEmail,
  type Promotion,
} from "@tiendadcc/utils";

export const STUDENT_EMAIL_HINT = "¿Tienes correo institucional de la U. de Chile?";
export const STUDENT_EMAIL_REQUIREMENT =
  "La verificación requiere un correo institucional de la U. de Chile.";

export function promotionBadge(promotion: Promotion): string {
  if (promotion.type === "studentDiscount") {
    return `${STUDENT_DISCOUNT_PERCENT}% alumno`;
  }
  if (promotion.type === "quantityPack3x2") {
    return "Pack 3x2";
  }
  return "2x15%";
}

export function activePromotions(
  promotions: Promotion[],
  now: Date = new Date(),
): Promotion[] {
  return promotions.filter((promotion) => {
    if (!promotion.active) return false;
    if (promotion.startsAt !== null && new Date(promotion.startsAt) > now) {
      return false;
    }
    if (promotion.endsAt !== null && new Date(promotion.endsAt) < now) {
      return false;
    }
    return true;
  });
}

export function needsStudentHint(email: string, studentVerified: boolean): boolean {
  return !studentVerified && isStudentEmail(email);
}
